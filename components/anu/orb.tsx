"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./orb.module.css";

// Keep all ten expressions; her feelings now follow the interaction and words.
function feelingFor(text: string) {
  if (/\b(haha|hehe|lol|happy|love|yay|joy|great)\b/i.test(text)) return 1;
  if (/\b(sad|miss|cry|lonely|sorry)\b/i.test(text)) return 2;
  if (/\b(angry|mad|furious|hate)\b/i.test(text)) return 3;
  if (/\b(anxious|worried|stress|nervous)\b/i.test(text)) return 4;
  if (/\b(scared|fear|afraid|terrified)\b/i.test(text)) return 5;
  if (/\b(ew|gross|disgust)\b/i.test(text)) return 6;
  if (/\b(bored|sleepy|tired|ennui)\b/i.test(text)) return 7;
  if (/\b(envy|jealous)\b/i.test(text)) return 8;
  if (/\b(shy|blush|embarrassed)\b/i.test(text)) return 9;
  return 0;
}

const vertexSource = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec2 pointer;
uniform float attention;
uniform float energy;
uniform float blinkOpen;
uniform float reaction;
uniform float action;
uniform float curiosity;
uniform float inspecting;
uniform float moodWeights[10];
uniform sampler2D fabric;
// All accessories Anu holds use the same pure black ink.
const vec3 accessoryInk = vec3(0.0);
float soft(float d, float blur) { return 1.0 - smoothstep(-blur, blur, d); }
float oval(vec2 p, vec2 size) { return (length(p / size) - 1.0) * min(size.x, size.y); }

void main() {
  float t = time;
  float joy = moodWeights[0] * .35 + moodWeights[1];
  float sad = moodWeights[2];
  float angry = moodWeights[3];
  float anxious = moodWeights[4];
  float fear = moodWeights[5];
  float disgust = moodWeights[6];
  float sleepy = moodWeights[7];
  float envy = moodWeights[8];
  float shy = moodWeights[9];
  float laugh = (.5 + .5 * sin(t * 5.6)) * (joy * action + reaction);
  float breath = sin(t * 1.65) * .006 + sin(t * .73) * .003;
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  p -= pointer * .035;
  p.y -= breath + joy * .012 * sin(t * 2.1) + laugh * .018;
  p.y += sad * .025 + sleepy * .02;
  p.x += disgust * .022 * sin(t * .65) + shy * .012;
  // Each feeling unfolds as a soft gesture and settles into an idle pose.
  float sigh = .5 + .5 * sin(t * 1.1);
  p.y += action * (sad * .022 * sigh + sleepy * .018 * sigh);
  p.x += action * (anxious * .012 * sin(t * 1.8) + fear * .009 * sin(t * 1.2));
  p /= 1.0 + angry * action * .018 * sigh - fear * action * .035;
  float stretch = breath + laugh * .025 - reaction * .025
                - sad * action * .014 * sigh + energy * .003;
  p /= 1.0 + attention * .012 - fear * .025;
  p /= vec2(1.0 - stretch, 1.0 + stretch);
  float tilt = curiosity * .050 + -.035 * pointer.x + .018 * sin(t * .8)
             + shy * .10 - disgust * .08 + envy * .04;
  p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;

  // Analytic sphere lighting and a tiny, cached fabric map: no mesh or ray march.
  vec2 sphere = p / vec2(.665, .675);
  float radius = length(sphere);
  float z = sqrt(max(.0001, 1.0 - dot(sphere, sphere)));
  vec3 normal = normalize(vec3(sphere, z));
  vec2 uv = vec2(atan(normal.x, max(.001, normal.z)), asin(clamp(normal.y, -.999, .999))) * .55 + .5;
  vec3 weave = texture2D(fabric, uv * 2.6).rgb;
  float bumpX = texture2D(fabric, uv * 2.6 + vec2(.0039, 0.0)).g - weave.g;
  float bumpY = texture2D(fabric, uv * 2.6 + vec2(0.0, .0039)).g - weave.g;
  vec3 fiberNormal = normalize(normal + vec3(bumpX, bumpY, 0.0) * .24);
  vec3 key = normalize(vec3(-.55, .78, 1.1));
  float diffuse = max(0.0, dot(fiberNormal, key));
  float fill = max(0.0, dot(normal, normalize(vec3(.9, .15, .5))));
  float velvet = pow(1.0 - max(0.0, normal.z), 2.3);
  float sheen = pow(max(0.0, dot(normal, normalize(key + vec3(0.0, 0.0, 1.0)))), 18.0);
  vec3 lavender = mix(vec3(.44, .31, .60), vec3(.83, .70, .98), .24 + .76 * diffuse);
  lavender += vec3(.09, .055, .13) * fill;
  lavender += vec3(.15, .12, .18) * sheen * .35;
  lavender += vec3(.24, .17, .30) * velvet * .55;
  float pile = (weave.g - .5) * .20 + (weave.b - .5) * .075 + (weave.r - .5) * .08;
  lavender *= 1.0 + pile;
  lavender *= mix(.85, 1.0, smoothstep(-.7, .35, p.y));
  lavender = mix(lavender, lavender * vec3(1.05, .96, 1.01), angry * .12);
  float edgePile = texture2D(fabric, vec2(atan(p.y, p.x) * 2.0, radius * 4.0)).b;
  float fuzz = (edgePile - .5) * .009;
  float silhouette = soft(radius - 1.0 + fuzz, .012);
  vec3 color = lavender;

  // Morph shared face geometry, rather than fading between separate faces.
  vec2 gaze = pointer * vec2(.053, .032);
  gaze.y -= curiosity * .055;
  float lift = inspecting * inspecting * (3.0 - 2.0 * inspecting);
  vec2 lensCenter = vec2(.135 + .20 * (1.0 - lift),
                        .31 - .075 * (1.0 - lift) + .003 * sin(t * 1.15) * lift) + gaze;
  float lensDistance = length(p - lensCenter);
  float lensInside = soft(lensDistance - .125, .006) * inspecting;
  vec2 facePoint = mix(p, lensCenter + (p - lensCenter) / 1.32, lensInside);
  gaze.y -= sad * .025 + shy * .015 + sleepy * .015;
  gaze.x += disgust * .025 + shy * .025 + anxious * .012 * sin(t * 1.6);
  float eyeWidth = .053 + fear * .008 + envy * .005;
  float eyeHeight = .063 - curiosity * .005 + anxious * .014 + fear * .018 - sleepy * .035;
  float slant = angry * .4 - sad * .28 - fear * .16 + disgust * .22 - shy * .13;
  gaze.y -= action * (sad * .018 * sigh + shy * .025 * sigh);
  gaze.x += action * (envy * .022 * sin(t * .9) + disgust * .016 * sin(t * .8));
  float lid = sleepy * (.60 + .13 * sigh) + angry * .24 + disgust * .25 + laugh * .48;
  lid += shy * action * .18 * sigh;
  float open = max(.035, blinkOpen * (1.0 - lid));
  float eyes = 0.0;
  float eyeContact = 0.0;
  float eyeSheen = 0.0;
  for (int i = 0; i < 2; i++) {
    float side = i == 0 ? -1.0 : 1.0;
    vec2 q = facePoint - gaze - vec2(side * .105, .335 + .008 * sin(t * .9)
      + side * curiosity * .011);
    float a = side * slant + curiosity * side * .10;
    q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    q.y /= open;
    float dome = max(oval(q, vec2(eyeWidth, eyeHeight)), -.022 - q.y);
    eyes = max(eyes, soft(dome, .0025));
    eyeContact = max(eyeContact, soft(dome - .007, .006));
    eyeSheen = max(eyeSheen, exp(-dot(q - vec2(-.014, .019), q - vec2(-.014, .019)) / .00032));
  }
  float smile = -.055 * (moodWeights[0] + moodWeights[1])
              + .035 * (sad + angry) + .006 * anxious
              + .018 * disgust + .008 * sleepy - .025 * envy - .018 * shy;
  smile = mix(smile, -.065, reaction * .85);
  smile = mix(smile, -.016, curiosity * .65);
  float width = .164 - curiosity * .035 - sad * .045 - fear * .045 - shy * .075 - sleepy * .05;
  width += laugh * .012 + action * (anxious * .005 * sin(t * 1.4) - sad * .008 * sigh);
  smile += action * (envy * .006 * sin(t * .9) + disgust * .006 * sin(t * .8));
  float thick = .014 + joy * .007 + laugh * .013;
  vec2 mouth = p - gaze - vec2(0.0, .205);
  mouth.y -= fear * .008 * sin(mouth.x * 65.0 + t * 1.4);
  float x = clamp(mouth.x, -width, width);
  float curve = smile * (1.0 - x * x / (width * width));
  float mouthDistance = length(mouth - vec2(x, curve)) - thick;
  float mouthShape = soft(mouthDistance, .0025);
  float mouthContact = soft(mouthDistance - .005, .006);
  float cheeks = exp(-dot((p - gaze - vec2(-.20, .24)) * vec2(1.0, 2.0), (p - gaze - vec2(-.20, .24)) * vec2(1.0, 2.0)) / .004)
               + exp(-dot((p - gaze - vec2(.20, .24)) * vec2(1.0, 2.0), (p - gaze - vec2(.20, .24)) * vec2(1.0, 2.0)) / .004);
  color = mix(color, vec3(.97, .43, .30), cheeks * (.25 * shy + .10 * shy * action * sigh + .04 * joy));
  // Soft contact shadows make the same familiar face feel sewn into the plush.
  color *= 1.0 - max(eyeContact, mouthContact) * .17;
  vec3 faceInk = vec3(.025, .018, .034) + eyeSheen * .055;
  color = mix(color, faceInk, max(eyes, mouthShape));
  // The little detective glass is drawn with the face, so it floats naturally.
  vec2 handleStart = lensCenter + vec2(.094, -.096);
  vec2 handleEnd = lensCenter + vec2(.205, -.245);
  vec2 handle = handleEnd - handleStart;
  float along = clamp(dot(p - handleStart, handle) / dot(handle, handle), 0.0, 1.0);
  float grip = soft(length(p - handleStart - handle * along) - .019, .003);
  color = mix(color, accessoryInk, grip * inspecting);
  float rim = soft(abs(lensDistance - .132) - .007, .002);
  color = mix(color, accessoryInk, rim * inspecting);
  gl_FragColor = vec4(color, silhouette);
}
`;

type AnuOrbProps = {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  focused: boolean;
  busy?: boolean;
  chatting?: boolean;
  replying?: boolean;
};

export function AnuOrb({ inputRef, value, focused, busy = false, chatting = false, replying = false }: AnuOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<() => void>(() => {});
  const inputActivity = useRef({ focused: false, typedAt: -10000, hasText: false, deleting: false });
  const selectedRef = useRef(0);
  const reactionRef = useRef(0);
  const actionRef = useRef(.5);
  const previousValue = useRef(value);
  const busyRef = useRef(busy);
  const chatRef = useRef({ chatting, replying });
  useEffect(() => {
    const activity = inputActivity.current;
    if (focused && !activity.focused) activity.typedAt = -10000;
    activity.focused = focused;
    if (previousValue.current !== value) {
      previousValue.current = value;
      activity.hasText = !!value.trim();
      if (!activity.hasText || activity.deleting) {
        activity.typedAt = -10000;
        selectedRef.current = 0;
        reactionRef.current = 0;
        actionRef.current = 0;
      } else if (focused) {
        selectedRef.current = feelingFor(value);
        actionRef.current = .7;
      }
    }
    if (!focused && !busy) selectedRef.current = 0;
    busyRef.current = busy;
    chatRef.current = { chatting, replying };
    if (replying) { selectedRef.current = 1; actionRef.current = .8; }
    else if (!busy && !value) selectedRef.current = 0;
    wakeRef.current();
  }, [value, focused, busy, chatting, replying]);
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    const stopInspecting = () => {
      inputActivity.current.typedAt = -10000;
      inputActivity.current.deleting = true;
      selectedRef.current = 0;
      reactionRef.current = 0;
      actionRef.current = 0;
      wakeRef.current();
    };
    const onInput = (event: Event) => {
      const activity = inputActivity.current;
      const type = (event as InputEvent).inputType || "";
      activity.hasText = !!field.value.trim();
      activity.deleting = type.startsWith("delete");
      if (activity.deleting || !activity.hasText) stopInspecting();
      else if (type.startsWith("insert")) activity.typedAt = performance.now();
      wakeRef.current();
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      // Backspace/Delete also count when the field is already empty.
      if (event.key === "Backspace" || event.key === "Delete") stopInspecting();
    };
    field.addEventListener("input", onInput);
    field.addEventListener("keydown", onKeyDown);
    field.addEventListener("blur", stopInspecting);
    return () => {
      field.removeEventListener("input", onInput);
      field.removeEventListener("keydown", onKeyDown);
      field.removeEventListener("blur", stopInspecting);
    };
  }, [inputRef]);

  const play = () => { reactionRef.current = 1; actionRef.current = 1; wakeRef.current(); };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    delete canvas.dataset.ready;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;

    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create orb shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || "Unable to compile orb shader");
      }
      return shader;
    };
    const program = gl.createProgram();
    if (!program) return;
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Unable to link orb shader");
      }
    } catch (error) {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      console.error(error);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    // Build the material once on the CPU, then reuse one 256px texture.
    let seed = 7319;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const texels = new Uint8Array(256 * 256 * 4);
    const grain = new Float32Array(256 * 256);
    const tufts = new Float32Array(16 * 16);
    for (let i = 0; i < grain.length; i++) grain[i] = random();
    for (let i = 0; i < tufts.length; i++) tufts[i] = random();
    const tuft = (x: number, y: number) => tufts[(y & 15) * 16 + (x & 15)];
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const offset = (y * 256 + x) * 4;
        const tx = x / 16, ty = y / 16;
        const ix = Math.floor(tx), iy = Math.floor(ty);
        const fx = tx - ix, fy = ty - iy;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const upper = tuft(ix, iy) * (1 - sx) + tuft(ix + 1, iy) * sx;
        const lower = tuft(ix, iy + 1) * (1 - sx) + tuft(ix + 1, iy + 1) * sx;
        const pile = grain[y * 256 + x] * .55 + grain[((y + 1) & 255) * 256 + ((x + 1) & 255)] * .3 + grain[((y + 2) & 255) * 256 + ((x + 1) & 255)] * .15;
        texels[offset] = Math.round((upper * (1 - sy) + lower * sy) * 255);
        texels[offset + 1] = Math.round(pile * 255);
        texels[offset + 2] = Math.round(random() * 255);
        texels[offset + 3] = 255;
      }
    }
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, texels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "fabric"), 0);
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    const pointer = gl.getUniformLocation(program, "pointer");
    const attention = gl.getUniformLocation(program, "attention");
    const energy = gl.getUniformLocation(program, "energy");
    const blinkUniform = gl.getUniformLocation(program, "blinkOpen");
    const reactionUniform = gl.getUniformLocation(program, "reaction");
    const actionUniform = gl.getUniformLocation(program, "action");
    const curiosityUniform = gl.getUniformLocation(program, "curiosity");
    const inspectingUniform = gl.getUniformLocation(program, "inspecting");
    let inspectingLevel = 0;
    let inspectingVelocity = 0;
    let curiosityLevel = 0;
    let curiosityVelocity = 0;
    const measure = document.createElement("canvas").getContext("2d");
    let reactionLevel = 0;
    let actionLevel = .5;
    const moodUniform = gl.getUniformLocation(program, "moodWeights[0]");
    const weights = new Float32Array(10);
    weights[0] = 1;
    let blinkStart = -10;
    let blinkDuration = .17;
    let nextBlink = 1 + Math.random() * 3;
    let doubleBlink = false;
    let blink = 1;
    let nextGlance = 0;
    let lastInteraction = -10;
    let idleX = 0;
    let idleY = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let elapsed = 0;
    let lastTime = 0;
    let lastPaint = 0;
    let visible = true;
    let disposed = false;
    const target = { x: 0, y: 0, attention: 0, energy: 0 };
    const follow = { x: 0, y: 0, vx: 0, vy: 0, attention: 0, energy: 0 };
    let bounds = canvas.getBoundingClientRect();
    let previousPointer: { x: number; y: number } | null = null;

    const onPointerMove = (event: PointerEvent) => {
      lastInteraction = elapsed;
      const scale = Math.max(Math.min(bounds.width, bounds.height) / 2, 1);
      const x = (event.clientX - bounds.left - bounds.width / 2) / scale;
      const y = -(event.clientY - bounds.top - bounds.height / 2) / scale;
      // A bounded gaze keeps the eyes inside the face even at screen edges.
      const distance = Math.hypot(x, y);
      const limit = Math.max(1, distance);
      target.x = x / limit;
      target.y = y / limit;
      target.attention = Math.max(0, 1 - distance / 1.7);
      if (previousPointer) {
        const movement = Math.hypot(x - previousPointer.x, y - previousPointer.y);
        target.energy = Math.min(1, target.energy + movement * .7 * target.attention);
      }
      previousPointer = { x, y };
    };
    const relax = () => {
      target.x = 0;
      target.y = 0;
      target.attention = 0;
      target.energy = 0;
      previousPointer = null;
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) relax();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") relax();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", relax);
    window.addEventListener("blur", relax);
    window.addEventListener("resize", resizeBounds, { passive: true });
    window.addEventListener("scroll", resizeBounds, { passive: true });
    function resizeBounds() { bounds = canvas!.getBoundingClientRect(); }

    const draw = () => {
      gl.uniform1f(time, reducedMotion.matches ? 2 : elapsed);
      gl.uniform2f(pointer, reducedMotion.matches ? 0 : follow.x, reducedMotion.matches ? 0 : follow.y);
      gl.uniform1f(attention, reducedMotion.matches ? 0 : follow.attention);
      gl.uniform1f(energy, reducedMotion.matches ? 0 : follow.energy);
      gl.uniform1f(blinkUniform, reducedMotion.matches ? 1 : blink);
      gl.uniform1f(reactionUniform, reducedMotion.matches ? 0 : reactionLevel);
      gl.uniform1f(actionUniform, reducedMotion.matches ? 0 : actionLevel);
      gl.uniform1f(curiosityUniform, curiosityLevel);
      gl.uniform1f(inspectingUniform, inspectingLevel);
      gl.uniform1fv(moodUniform, weights);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (canvas.dataset.ready !== "true") canvas.dataset.ready = "true";
    };
    const resize = () => {
      bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 560 / Math.max(1, canvas.clientWidth));
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      draw();
    };
    const schedule = () => {
      if (!disposed && !frame && visible && !document.hidden) frame = requestAnimationFrame(animate);
    };
    wakeRef.current = schedule;
    const animate = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !visible) { lastTime = 0; return; }
      const active = performance.now() - inputActivity.current.typedAt < 700 || elapsed - lastInteraction < .4 || reactionRef.current > .01 || busyRef.current || chatRef.current.replying;
      const interval = 1000 / (active ? 60 : 30);
      if (!reducedMotion.matches && now - lastPaint < interval - 1) { schedule(); return; }
      lastPaint = now;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
      if (!document.hidden && !reducedMotion.matches) {
        elapsed += dt;
        if (elapsed >= nextBlink) {
          blinkStart = elapsed;
          blinkDuration = .12 + Math.random() * .10;
          if (doubleBlink) {
            nextBlink = elapsed + 1.8 + Math.random() * 4.5;
            doubleBlink = false;
          } else if (Math.random() < .22) {
            nextBlink = elapsed + blinkDuration + .10;
            doubleBlink = true;
          } else {
            nextBlink = elapsed + 1.8 + Math.random() * 4.5;
          }
        }
        const blinkProgress = (elapsed - blinkStart) / blinkDuration;
        blink = blinkProgress < 1 ? 1 - Math.pow(Math.max(0, Math.sin(Math.PI * blinkProgress)), .7) : 1;
        if (elapsed > nextGlance) {
          idleX = (Math.random() - .5) * .65;
          idleY = (Math.random() - .5) * .40;
          nextGlance = elapsed + 1.8 + Math.random() * 3.2;
          if (Math.random() < .35) { idleX = 0; idleY = 0; }
        }
        const idle = elapsed - lastInteraction > 2.5;
        let gazeX = idle ? idleX : target.x;
        let gazeY = idle ? idleY : target.y;
        if (chatRef.current.chatting && !inputActivity.current.focused) {
          gazeX = idleX * .65;
          gazeY = -.48 + idleY * .15;
        }
        const field = inputRef.current;
        if (inputActivity.current.focused && field) {
          const rect = field.getBoundingClientRect();
          const style = getComputedStyle(field);
          if (measure) measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const caret = field.value.slice(0, field.selectionStart ?? field.value.length);
          const textWidth = measure?.measureText(caret).width ?? caret.length * 8;
          const padding = parseFloat(style.paddingLeft) || 20;
          const x = rect.left + Math.min(rect.width - padding, Math.max(padding, padding + textWidth - field.scrollLeft));
          gazeX = Math.max(-.8, Math.min(.8, (x - bounds.left - bounds.width / 2) / (bounds.width / 2)));
          gazeY = -.85;
        }
        // Damped springs add a tiny, soft overshoot when changing direction.
        follow.vx += ((gazeX - follow.x) * 64 - follow.vx * 16) * dt;
        follow.vy += ((gazeY - follow.y) * 64 - follow.vy * 16) * dt;
        follow.x += follow.vx * dt;
        follow.y += follow.vy * dt;
        const ease = 1 - Math.exp(-6 * dt);
        follow.attention += (target.attention - follow.attention) * ease;
        follow.energy += (target.energy - follow.energy) * ease;
        target.energy *= Math.exp(-2.5 * dt);
      }
      const recentlyTyped = performance.now() - inputActivity.current.typedAt < 450;
      const curiosityTarget = inputActivity.current.focused ? .85 : 0;
      const inspectingTarget = inputActivity.current.focused && inputActivity.current.hasText && recentlyTyped ? 1 : 0;
      inspectingVelocity += ((inspectingTarget - inspectingLevel) * 38 - inspectingVelocity * 12.5) * dt;
      inspectingLevel = Math.max(0, Math.min(1, inspectingLevel + inspectingVelocity * dt));
      // A damped lift lets her ease the glass up and gently settle it.
      curiosityVelocity += ((curiosityTarget - curiosityLevel) * 38 - curiosityVelocity * 12.5) * dt;
      curiosityLevel = Math.max(0, Math.min(1, curiosityLevel + curiosityVelocity * dt));
      if (busyRef.current) selectedRef.current = 7;
      const moodEase = 1 - Math.exp(-3.8 * dt);
      reactionLevel += (reactionRef.current - reactionLevel) * (1 - Math.exp(-7 * dt));
      actionLevel += (actionRef.current - actionLevel) * (1 - Math.exp(-5 * dt));
      actionRef.current = Math.max(0, actionRef.current - dt * .18);
      for (let i = 0; i < weights.length; i++) {
        weights[i] += ((i === selectedRef.current ? 1 : 0) - weights[i]) * moodEase;
      }
      reactionRef.current = Math.max(0, reactionRef.current - dt * .65);
      if (reducedMotion.matches) {
        curiosityLevel = curiosityTarget;
        inspectingLevel = inspectingTarget;
        for (let i = 0; i < weights.length; i++) weights[i] = i === selectedRef.current ? 1 : 0;
      }
      lastTime = now;
      draw();
      if (!reducedMotion.matches) schedule();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const syncVisibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      schedule();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncVisibility();
    });
    intersection.observe(canvas);
    const onContextLost = () => {
      visible = false;
      cancelAnimationFrame(frame);
      frame = 0;
      delete canvas.dataset.ready;
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", syncVisibility);
    reducedMotion.addEventListener("change", syncVisibility);
    schedule();

    return () => {
      disposed = true;
      wakeRef.current = () => {};
      intersection.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      delete canvas.dataset.ready;
      document.removeEventListener("visibilitychange", syncVisibility);
      reducedMotion.removeEventListener("change", syncVisibility);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", relax);
      window.removeEventListener("blur", relax);
      window.removeEventListener("resize", resizeBounds);
      window.removeEventListener("scroll", resizeBounds);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((shader) => gl.deleteShader(shader));
    };
  }, [inputRef]);

  return (
    <button type="button" className={styles.orb} data-chatting={chatting} onClick={play} aria-label="Make Anu giggle">
      <span className={styles.fallback} aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" className={styles.canvas} />
    </button>
  );
}
