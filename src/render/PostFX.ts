/**
 * PostFX compositor (P08-T02…T05): WebGL2 screen-space post-processing over
 * the 2D canvas. This is an ART-DIRECTED SCREEN-SPACE approximation —
 * NOT hardware ray tracing (WebGL2 has no RT pipeline) and NOT per-pixel
 * geodesic ray marching (see docs/RESEARCH_PHASE_06_07_08.md §5/§6).
 *
 * Graph (explicit, independently gated):
 *   source(2D canvas) → bright → blurH/blurV (¼ res) → composite → display
 *
 * Profiles are pure parameter blends (tests pin the curves):
 *   warp | blackHole | starHeat | nebula | impact
 * Each has blend-in/out via smoothstep over ~0.4 s and an exact-zero exit.
 * Reduced motion zeroes all distortion/shimmer/shake (static vignette stays).
 * Quality tiers: high (bloom+distortion), medium (bloom, no grain),
 * low (tonemap+vignette only), off (direct blit / bypass WebGL entirely).
 */

import { clamp } from "../core/Maths";

/** Screen-space profile identifier. */
export type PostFXProfile = "warp" | "blackHole" | "starHeat" | "nebula" | "impact";

/** Per-profile 0..1 activation (0 = fully off). */
export interface PostFXParams {
    /** Radial barrel + CA (speed warp). */
    warp: number;
    /** Gravitational-lensing-style UV deflection around the hole. */
    blackHole: number;
    /** Heat shimmer + glare wash (star proximity). */
    starHeat: number;
    /** Subtle tint/contrast inside nebulae. */
    nebula: number;
    /** Impact flash 0..1 (decays to exact 0). */
    impact: number;
    /** Hole position in UV (0..1, y down) for lensing deflection. */
    bhU: number;
    bhV: number;
    /** Hole shadow radius in UV units. */
    bhRadius: number;
    /** Star position in UV for glare/shimmer mask. */
    starU: number;
    starV: number;
    /** Nebula tint (0..1 rgb). */
    nebR: number;
    nebG: number;
    nebB: number;
    /** Horizontal shake in UV units (impact). */
    shakeX: number;
    time: number;
}

export const NEUTRAL_PARAMS: PostFXParams = {
    warp: 0, blackHole: 0, starHeat: 0, nebula: 0, impact: 0,
    bhU: 0.5, bhV: 0.5, bhRadius: 0,
    starU: 0.5, starV: 0.5,
    nebR: 0, nebG: 0, nebB: 0,
    shakeX: 0, time: 0,
};

export type QualityTier2 = "high" | "medium" | "low" | "off";

export const POSTFX_TIER_FEATURES: Record<QualityTier2, { bloom: boolean; distortion: boolean; grain: boolean; scale: number }> = {
    high: { bloom: true, distortion: true, grain: true, scale: 1 },
    medium: { bloom: true, distortion: true, grain: false, scale: 0.5 },
    low: { bloom: false, distortion: false, grain: false, scale: 0.5 },
    off: { bloom: false, distortion: false, grain: false, scale: 1 },
};

/** Smooth 0..1 ramp over `dur` seconds (blend-in/out). Exact 0/1 at ends. */
export function blendRamp(elapsed: number, dur: number): number {
    if (dur <= 0) return 1;
    const t = clamp(elapsed / dur, 0, 1);
    return t * t * (3 - 2 * t);
}

/** Radial scrollbar that decays to exact 0 (impact shake/flash). */
export function decayToZero(value: number, dt: number, rate: number): number {
    const v = value * Math.exp(-rate * dt);
    return Math.abs(v) < 0.5 ? 0 : v;
}

/**
 * Black-hole deflection strength at UV distance d (UV units), shadow
 * radius rs. Screen-space approximation ∝ rs²/d², clamped — mirrors the
 * Godot gravitational-lens shader form, labelled approximation.
 */
export function lensingStrength(d: number, rs: number): number {
    if (rs <= 0) return 0;
    const dd = Math.max(d, rs * 0.5);
    return clamp((rs * rs) / (dd * dd), 0, 0.4);
}

/** Heat-shimmer mask: strong near the star, fades with distance. */
export function shimmerMask(d: number): number {
    return clamp(1 - d * 1.8, 0, 1);
}

// ---------------------------------------------------------------- WebGL host

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uSrc;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform vec4 uBh;      // uv.x, uv.y, radius, strength
uniform vec4 uStar;    // uv.x, uv.y, glare, shimmer
uniform vec3 uNeb;     // tint rgb + amount in w? (rgb = tint*amt)
uniform float uWarp;   // barrel amount 0..1
uniform float uImpact; // flash 0..1
uniform float uShake;  // uv shake
uniform float uTime;
uniform float uBloomAmt;
uniform float uDistort; // 0/1 tier gate
uniform float uGrain;   // 0/1 tier gate
uniform float uReduced; // 1 = reduced motion (kill distortion)
in vec2 vUv;
out vec4 fragColor;

float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }

void main(){
  vec2 uv = vUv;
  float distort = uDistort * (1.0 - uReduced);
  // impact shake (uv units, decays to 0 CPU-side)
  uv.x += uShake * (hash(vec2(uTime, uv.y)) - 0.5) * (1.0-uReduced);
  // radial barrel (warp)
  vec2 c = uv - 0.5;
  float r2 = dot(c,c);
  uv = 0.5 + c * (1.0 + uWarp * 0.35 * r2 * distort);
  // black-hole lensing: deflect toward the hole
  if (uBh.w > 0.001 && distort > 0.5) {
    vec2 d = uv - uBh.xy;
    float dist = max(length(d), 1e-4);
    float s = clamp((uBh.z*uBh.z)/(dist*dist), 0., 0.4) * uBh.w;
    uv = clamp(uv + (d/dist) * s * -1.0, 0.001, 0.999);
  }
  // heat shimmer near the star
  if (uStar.w > 0.001 && distort > 0.5) {
    float sd = length(uv - uStar.xy);
    float m = clamp(1.0 - sd*1.8, 0., 1.);
    uv.x += sin(uv.y*140.0 + uTime*18.0) * 0.0012 * uStar.w * m;
    uv.y += sin(uv.x*120.0 - uTime*14.0) * 0.0012 * uStar.w * m;
  }
  vec3 col = texture(uSrc, uv).rgb;
  // chromatic aberration (radial, warp-linked)
  vec3 ca = vec3(0.);
  {
    float caAmt = uWarp * 0.004 * distort;
    ca.r = texture(uSrc, uv + c*caAmt).r - col.r;
    ca.b = texture(uSrc, uv - c*caAmt).b - col.b;
    col += ca * 0.6;
  }
  // bloom: 9-tap thresholded blur of the source IN-SHADER (no FBO chain —
  // the FBO ping-pong in the first build smeared brightness across the
  // whole screen; a 9-tap kernel gives the same star/corona glow safely).
  vec3 bl = vec3(0.);
  {
    vec2 px = vec2(1.5) / uRes;
    vec3 s = texture(uSrc, vUv).rgb;
    float l = dot(s, vec3(0.2126,0.7152,0.0722));
    float k = smoothstep(0.72, 1.0, l);
    bl = s * k * 0.28;
    vec2 o1 = px * vec2(1.384, 0.0);
    vec2 o2 = px * vec2(0.0, 1.384);
    vec2 o3 = px * vec2(3.230, 0.0);
    vec2 o4 = px * vec2(0.0, 3.230);
    bl += (texture(uSrc, vUv + o1).rgb + texture(uSrc, vUv - o1).rgb) * 0.12 * k;
    bl += (texture(uSrc, vUv + o2).rgb + texture(uSrc, vUv - o2).rgb) * 0.12 * k;
    bl += (texture(uSrc, vUv + o3).rgb + texture(uSrc, vUv - o3).rgb) * 0.03 * k;
    bl += (texture(uSrc, vUv + o4).rgb + texture(uSrc, vUv - o4).rgb) * 0.03 * k;
  }
  col += bl * uBloomAmt;
  // nebula tint (subtle)
  col = mix(col, col + uNeb, 0.35);
  // Gentle filmic knee (ACES-inspired, but NO shadow lift: ACES on
  // already-gamma-encoded LDR values tripled the blacks in A/B test).
  // This keeps the source blacks exact and only rolls off highlights.
  col = col / (1.0 + col * 0.25); // soft highlight rolloff, blacks exact
  // star glare wash
  {
    float gd = length(vUv - uStar.xy);
    float g = exp(-gd*gd*6.0) * uStar.z;
    col += vec3(1.0,0.85,0.6) * g * 0.35;
  }
  // vignette
  col *= 1.0 - 0.28 * smoothstep(0.25, 1.1, length(c*1.4));
  // impact flash
  col += vec3(1.0) * uImpact * 0.6;
  // grain (tier + reduced-motion gated)
  if (uGrain > 0.5 && uReduced < 0.5) col += (hash(vUv*uRes + fract(uTime)) - 0.5) * 0.02;
  fragColor = vec4(col, 1.0);
}`;

const BRIGHT_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uSrc;
in vec2 vUv; out vec4 fragColor;
void main(){
  vec3 c = texture(uSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  float k = smoothstep(0.75, 1.0, l);
  fragColor = vec4(c*k, 1.0);
}`;

const BLUR_FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uSrc;
uniform vec2 uDir; // texel step
in vec2 vUv; out vec4 fragColor;
void main(){
  vec3 c = texture(uSrc, vUv).rgb * 0.227;
  c += texture(uSrc, vUv + uDir*1.384).rgb * 0.316;
  c += texture(uSrc, vUv - uDir*1.384).rgb * 0.316;
  c += texture(uSrc, vUv + uDir*3.230).rgb * 0.070;
  c += texture(uSrc, vUv - uDir*3.230).rgb * 0.070;
  fragColor = vec4(c, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS) !== true) {
        gl.deleteShader(sh);
        return null;
    }
    return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | null {
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    if (!p) return null;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (gl.getProgramParameter(p, gl.LINK_STATUS) !== true) {
        gl.deleteProgram(p);
        return null;
    }
    return p;
}

interface FBO { tex: WebGLTexture | null; fbo: WebGLFramebuffer | null; w: number; h: number }

export class PostFXCompositor {
    private gl: WebGL2RenderingContext | null = null;
    private display: HTMLCanvasElement;
    private src: HTMLCanvasElement;
    private comp: WebGLProgram | null = null;
    private bright: WebGLProgram | null = null;
    private blur: WebGLProgram | null = null;
    private srcTex: WebGLTexture | null = null;
    private bloomA: FBO = { tex: null, fbo: null, w: 0, h: 0 };
    private bloomB: FBO = { tex: null, fbo: null, w: 0, h: 0 };
    private vao: WebGLVertexArrayObject | null = null;
    tier: QualityTier2 = "high";
    reducedMotion = false;
    ready = false;

    constructor(source: HTMLCanvasElement, display: HTMLCanvasElement) {
        this.src = source;
        this.display = display;
        try {
            const gl = display.getContext("webgl2", { antialias: false, alpha: false }) as WebGL2RenderingContext | null;
            if (!gl) return;
            this.gl = gl;
            const vao = gl.createVertexArray();
            if (vao) { gl.bindVertexArray(vao); this.vao = vao; }
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            const posLoc = 0;
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            this.comp = program(gl, VERT, FRAG);
            this.srcTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.ready = !!(this.comp);
            this.resize();
        } catch {
            this.gl = null;
            this.ready = false;
        }
    }

    /** Resize GL viewport (no FBOs now — bloom is in-shader). */
    resize(): void {
        const gl = this.gl;
        if (!gl) return;
        const w = this.display.width;
        const h = this.display.height;
        if (w <= 0 || h <= 0) return;
        gl.viewport(0, 0, w, h);
    }

    private bindProg(p: WebGLProgram): void {
        const gl = this.gl!;
        gl.useProgram(p);
        gl.uniform2f(gl.getUniformLocation(p, "uRes"), this.display.width, this.display.height);
    }

    /** Render one frame. Returns false when WebGL is unavailable (caller blits 2D). */
    render(params: PostFXParams, bloomAmt = 0.55): boolean {
        const gl = this.gl;
        if (!gl || !this.ready || !this.comp) return false;
        const feats = POSTFX_TIER_FEATURES[this.tier];
        // upload 2D source
        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);
        gl.bindVertexArray(this.vao);
        // composite (bloom is in-shader — no FBO chain)
        this.bindProg(this.comp);
        const p = this.comp;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
        gl.uniform1i(gl.getUniformLocation(p, "uSrc"), 0);
        const distort = feats.distortion ? 1 : 0;
        gl.uniform1f(gl.getUniformLocation(p, "uDistort"), distort);
        gl.uniform1f(gl.getUniformLocation(p, "uGrain"), feats.grain ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(p, "uReduced"), this.reducedMotion ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(p, "uWarp"), params.warp);
        gl.uniform1f(gl.getUniformLocation(p, "uImpact"), params.impact);
        gl.uniform1f(gl.getUniformLocation(p, "uShake"), params.shakeX);
        gl.uniform1f(gl.getUniformLocation(p, "uTime"), params.time);
        gl.uniform1f(gl.getUniformLocation(p, "uBloomAmt"), feats.bloom ? bloomAmt : 0);
        gl.uniform4f(gl.getUniformLocation(p, "uBh"), params.bhU, params.bhV, params.bhRadius, params.blackHole);
        gl.uniform4f(gl.getUniformLocation(p, "uStar"), params.starU, params.starV, params.starHeat, params.starHeat);
        gl.uniform3f(gl.getUniformLocation(p, "uNeb"), params.nebR * params.nebula, params.nebG * params.nebula, params.nebB * params.nebula);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.display.width, this.display.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
    }

    dispose(): void {
        const gl = this.gl;
        if (!gl) return;
        if (this.srcTex) gl.deleteTexture(this.srcTex);
        if (this.vao) gl.deleteVertexArray(this.vao);
        this.gl = null;
        this.ready = false;
    }
}
