/*
 * RoutePilot (user 2026-11-09): the simple Aв†’B autopilot вЂ” NOT the old
 * full landing-tour autopilot. Behavior contract:
 *
 *  - CHASE: point the nose at the target (or a threat-avoiding hold),
 *    full thrust; boost auto-engages while far and aligned (the user's
 *    "С„РѕСЂСЃР°Р¶ Р°РІС‚Рѕ").
 *  - BRAKE: inside the braking window, flip retrograde and decelerate.
 *  - ARRIVED: hold position at arriveDist from the target center; thrust 0.
 *  - THREAT (user spec): if any body sits on the course (closed-form TTI
 *    < 5 s), the pilot does NOT dodge вЂ” it BRAKES TO A STOP and waits,
 *    drawing the route line red until the player steers the nose back
 *    onto the course (within RESUME_ANGLE) and the threat is gone.
 *
 * Pure control: reads bodies, writes ship.thrust/boost. No rendering.
 */

import { timeToImpact, IMPACT_WARN_SECONDS } from "../universe/CollisionPredict";

export interface RouteTarget {
    x: number; y: number; radius: number; vx?: number; vy?: number;
}
export interface RouteThreat {
    x: number; y: number; vx: number; vy: number; radius: number;
}
export type RoutePilotPhase = "chase" | "brake" | "arrived" | "stopped";
export interface RoutePilotState { active: boolean; phase: RoutePilotPhase; wantBoost: boolean; }
export function createRoutePilot(): RoutePilotState { return { active: false, phase: "chase", wantBoost: false }; }
export const PILOT_ARRIVE_DIST = 600;
export const PILOT_RESUME_ANGLE = Math.PI / 12;

function relInfo(tx:number,ty:number,tvx:number,tvy:number,sx:number,sy:number,svx:number,svy:number){
    const dx=tx-sx, dy=ty-sy; const d=Math.hypot(dx,dy);
    const closing=((svx-tvx)*dx+(svy-tvy)*dy)/Math.max(1e-9,d);
    return {d,closing,dx,dy};
}

export interface PilotIntent { thrustX:number; thrustY:number; boost:boolean; stopRequested:boolean; }

export function pilotStep(
    s: RoutePilotState,
    target: RouteTarget,
    threats: RouteThreat[],
    ship: { x:number; y:number; vx:number; vy:number; angle:number },
    dt:number,
    engineAccel:number,
    opts:{ intermediate?:boolean }={},
): PilotIntent {
    const none:PilotIntent={thrustX:0,thrustY:0,boost:false,stopRequested:false};
    if(!s.active) return none;
    let threat=false;
    for(const b of threats){
        const rx=b.x-ship.x, ry=b.y-ship.y, ux=b.vx-ship.vx, uy=b.vy-ship.vy;
        const res=timeToImpact(rx,ry,ux,uy,b.radius+30);
        if(res.tti!==null && res.tti<IMPACT_WARN_SECONDS){threat=true;break;}
    }
    if(threat && s.phase!=="stopped") s.phase="stopped";
    const tvx=target.vx??0, tvy=target.vy??0;
    const info=relInfo(target.x,target.y,tvx,tvy,ship.x,ship.y,ship.vx,ship.vy);
    const bearing=Math.atan2(target.y-ship.y,target.x-ship.x);
    const headingErr=Math.abs(((bearing-ship.angle+Math.PI*3)%(Math.PI*2))-Math.PI);
    // velocity-aware intercept: aim where the (moving) target will be
    const relSpd=Math.hypot(ship.vx-tvx,ship.vy-tvy);
    const interceptT=Math.max(0, info.d-2600)/Math.max(1200,relSpd);
    const aimX=target.x+tvx*interceptT, aimY=target.y+tvy*interceptT;
    const aimBearing=Math.atan2(aimY-ship.y,aimX-ship.x);
    if(s.phase==="stopped"){
        if(threat){
            const spd=Math.hypot(ship.vx,ship.vy);
            if(spd>5) return {thrustX:-ship.vx/spd,thrustY:-ship.vy/spd,boost:false,stopRequested:true};
            return { ...none, stopRequested:true };
        }
        if(headingErr<PILOT_RESUME_ANGLE) s.phase="chase";
        else return { ...none, stopRequested:true };
    }
    if(opts.intermediate){
        s.phase="chase"; s.wantBoost=false;
        const ax=Math.cos(aimBearing), ay=Math.sin(aimBearing);
        return {thrustX:ax,thrustY:ay,boost:false,stopRequested:false};
    }
    const arrive=target.radius+PILOT_ARRIVE_DIST;
    if(info.d<=arrive+50){
        s.phase="arrived";
        const spd=Math.hypot(ship.vx,ship.vy);
        if(spd>40) return {thrustX:-ship.vx/spd,thrustY:-ship.vy/spd,boost:false,stopRequested:false};
        return none;
    }
    // speed profile: cannot approach faster than the braking curve allows
    const vmax=Math.sqrt(2*Math.max(1,engineAccel)*Math.max(0,info.d-arrive))*0.85+40;
    const rvx=ship.vx-tvx, rvy=ship.vy-tvy;
    const rm=Math.hypot(rvx,rvy);
    const brakeDist=(Math.max(0,info.closing)*Math.max(0,info.closing))/(2*Math.max(1,engineAccel))+arrive;
    if(info.d<brakeDist*1.2 && info.closing>50) s.phase="brake";
    else if(s.phase==="brake"){
        if(info.d>brakeDist*1.35 || info.closing<-40 || rm>vmax+600) s.phase="chase";
    } else s.phase=info.closing>-50 ? "chase" : "brake";
    if(s.phase==="brake"){
        if(rm>20) return {thrustX:-rvx/rm,thrustY:-rvy/rm,boost:false,stopRequested:false};
        return none;
    }
    s.wantBoost=false;
    // chase: steer by velocity error, cap approach speed, never boost
    let ax=Math.cos(aimBearing), ay=Math.sin(aimBearing);
    if(rm>vmax && rm>1){
        const vxN=rvx/rm, vyN=rvy/rm;
        const proj=ax*vxN+ay*vyN;
        if(proj>0.25){ ax=-vxN; ay=-vyN; }
    }
    s.phase="chase";
    return {thrustX:ax,thrustY:ay,boost:false,stopRequested:false};
}
