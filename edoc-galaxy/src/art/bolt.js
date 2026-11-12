import { TAU } from "./rng";
import { glow } from "./scenes";

/**
 * Bolt, the little hover-bot who keeps the pilot company. Drawn in code: a pale rounded shell, a dark visor with two eyes
 * that follow the pointer and blink, an antenna with a bulb, side pods and a thruster that breathes.
 *
 * Three states, set through `o`:
 *   idle     (default)  bobs, blinks, eyes follow the pointer (`o.look`, -1..1 each way)
 *   talking  (`o.talk` 0..1)  eyes face the pilot, a row of voice bars lights up under them, rings travel out of the antenna bulb
 *   cheer    (`o.cheer` 0..1) eyes turn into smiles
 * `o.rgb` is the light colour ("r,g,b"). With `calm` (reduced motion) nothing moves: talking shows the voice bars at rest,
 * so the state still reads without any animation.
 */
export function drawBolt(g, x, y, s, t, calm, o = {}) {
  const talk = o.talk || 0;
  const look = talk > 0.3 ? [0, 0.15] : o.look || [0, 0];
  const cheer = o.cheer || 0;
  const rgb = o.rgb || "120,245,230";
  const bob = calm ? 0 : Math.sin(t * (talk > 0.3 ? 3 : 2.1)) * 3.2 * s;
  const tilt = calm ? 0 : Math.sin(t * 1.3) * 0.045 + look[0] * 0.07 + (talk > 0.3 ? 0.05 : 0);
  const cy = y + bob;

  // a soft shadow far below, so he reads as floating
  g.save();
  g.fillStyle = "rgba(2,8,12,0.28)";
  g.beginPath();
  g.ellipse(x, y + 46 * s, 20 * s * (1 - bob / (90 * s)), 4.2 * s, 0, 0, TAU);
  g.fill();
  g.restore();

  // thruster
  const flick = calm ? 0.8 : 0.7 + 0.3 * Math.sin(t * 17) * Math.sin(t * 5.3);
  glow(g, x, cy + 27 * s, 26 * s, "150,235,255", 0.5 * flick);
  g.save();
  g.translate(x, cy);
  g.rotate(tilt);
  const flame = g.createLinearGradient(0, 21 * s, 0, 36 * s);
  flame.addColorStop(0, "rgba(220,250,255,0.95)");
  flame.addColorStop(1, "rgba(120,200,255,0)");
  g.fillStyle = flame;
  g.beginPath();
  g.moveTo(-6 * s, 21 * s);
  g.quadraticCurveTo(0, (30 + 9 * flick) * s, 6 * s, 21 * s);
  g.closePath();
  g.fill();

  // side pods
  [-1, 1].forEach((d) => {
    g.fillStyle = "#5fa9a8";
    g.beginPath();
    g.ellipse(d * 21 * s, 2 * s, 4.2 * s, 8.5 * s, 0, 0, TAU);
    g.fill();
    g.fillStyle = `rgba(${rgb},0.9)`;
    g.fillRect(d * 21 * s - 1 * s, -1 * s, 2 * s, 6 * s);
  });

  // antenna
  g.strokeStyle = "#9fb4b9";
  g.lineWidth = 2.2 * s;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(1 * s, -19 * s);
  g.quadraticCurveTo(4 * s, -27 * s, 9 * s, -29 * s);
  g.stroke();
  const pulse = calm ? 0.8 : 0.6 + 0.4 * Math.sin(t * (talk > 0.3 ? 9 : 3.2));
  glow(g, 9 * s, -29 * s, 13 * s, rgb, 0.55 * pulse + (talk > 0.3 ? 0.25 : 0));
  g.fillStyle = `rgba(${rgb},1)`;
  g.beginPath();
  g.arc(9 * s, -29 * s, 3.2 * s, 0, TAU);
  g.fill();
  if (talk > 0.3) {
    // voice rings travelling out of the bulb (one resting ring when motion is calm)
    for (let i = 0; i < (calm ? 1 : 3); i++) {
      const p = calm ? 0.45 : (t * 0.9 + i / 3) % 1;
      g.strokeStyle = `rgba(${rgb},${0.55 * (1 - p)})`;
      g.lineWidth = 1.6 * s;
      g.beginPath();
      g.arc(9 * s, -29 * s, (5 + p * 16) * s, -Math.PI * 0.95, -Math.PI * 0.05);
      g.stroke();
    }
  }

  // shell
  const shell = g.createRadialGradient(-8 * s, -10 * s, 3 * s, 0, 0, 27 * s);
  shell.addColorStop(0, "#f6fbfa");
  shell.addColorStop(0.55, "#cfe3e2");
  shell.addColorStop(1, "#7f9ea4");
  g.fillStyle = shell;
  g.beginPath();
  g.ellipse(0, 0, 23 * s, 20.5 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.65)";
  g.lineWidth = 1.4 * s;
  g.beginPath();
  g.ellipse(0, 0, 23 * s, 20.5 * s, 0, Math.PI * 1.05, Math.PI * 1.55);
  g.stroke();
  // a trim line round the middle
  g.strokeStyle = "rgba(60,110,120,0.35)";
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.ellipse(0, 6 * s, 22 * s, 11 * s, 0, 0.15, Math.PI - 0.15);
  g.stroke();

  // visor
  const vis = g.createLinearGradient(0, -14 * s, 0, 10 * s);
  vis.addColorStop(0, "#0e2230");
  vis.addColorStop(1, "#06121c");
  g.fillStyle = vis;
  g.beginPath();
  g.ellipse(0, -2.5 * s, 16.5 * s, 11.5 * s, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(160,220,230,0.45)";
  g.lineWidth = 1.1 * s;
  g.stroke();

  // eyes (higher in the visor while talking, to leave room for the voice bars)
  const ex = look[0] * 3.2 * s, ey = look[1] * 2.2 * s - (talk > 0.3 ? 1.6 * s : 0);
  const blinkPhase = calm ? 1 : (t % 3.7) / 3.7;
  const blink = blinkPhase > 0.955 ? 0.12 : 1;
  [-1, 1].forEach((d) => {
    const px = d * 6.6 * s + ex, py = -3 * s + ey;
    glow(g, px, py, 11 * s, rgb, 0.5);
    g.fillStyle = `rgba(${rgb},1)`;
    if (cheer > 0.5) {
      g.strokeStyle = `rgba(${rgb},1)`;
      g.lineWidth = 2.6 * s;
      g.beginPath();
      g.arc(px, py + 2 * s, 3.6 * s, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else {
      g.beginPath();
      g.ellipse(px, py, 3.6 * s, 4.4 * s * blink, 0, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.arc(px - 1 * s, py - 1.4 * s * blink, 1 * s, 0, TAU);
      g.fill();
    }
  });

  // voice bars: five little lights that rise and fall like a speaker's level meter
  if (talk > 0.3) {
    const base = 4.2 * s;
    for (let i = -2; i <= 2; i++) {
      const lvl = calm ? 0.55 - Math.abs(i) * 0.12 : 0.35 + 0.55 * Math.abs(Math.sin(t * 9 + i * 1.7) * Math.cos(t * 4.1 + i));
      const hgt = (1.2 + lvl * 4.4) * s;
      g.fillStyle = `rgba(${rgb},${0.55 + lvl * 0.4})`;
      g.beginPath();
      g.roundRect ? g.roundRect(i * 3.4 * s - 1 * s, base - hgt / 2, 2 * s, hgt, 1 * s) : g.rect(i * 3.4 * s - 1 * s, base - hgt / 2, 2 * s, hgt);
      g.fill();
    }
  }
  g.restore();
}
