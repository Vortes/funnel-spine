'use client';
"use client";

// src/react/AtlasFunnel.tsx
import { forwardRef, memo, useEffect as useEffect2, useId, useLayoutEffect, useMemo, useRef, useState as useState2 } from "react";

// dist/lab/stipple-shader.js
var DEFAULT_SCALE = 2;
var imageCache = /* @__PURE__ */ new Map();
var renderer;
var vertexSource = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 size;
uniform float scale;
uniform float baseRadius;
uniform float gain;
uniform uint seed;
out float pointRadius;
out float pointSize;

uint randomBits(uint state) {
  uint t=state;
  t=(t^(t>>15u))*(t|1u);
  t^=t+(t^(t>>7u))*(t|61u);
  return t^(t>>14u);
}

float randomAt(uint index) {
  return float(randomBits(seed+(index+1u)*0x6D2B79F5u))/4294967296.0;
}

void main() {
  uint index=uint(gl_VertexID)*3u;
  vec2 position=floor(vec2(randomAt(index),randomAt(index+1u))*size*100.0+0.5)/100.0;
  float group=floor(randomAt(index+2u)*6.0);
  pointRadius=baseRadius*(0.8+group*0.08)*(1.0+gain)*scale;
  pointSize=ceil(pointRadius*2.0+2.0);
  gl_Position=vec4(position.x/size.x*2.0-1.0,1.0-position.y/size.y*2.0,0.0,1.0);
  gl_PointSize=pointSize;
}`;
var fragmentSource = `#version 300 es
precision mediump float;
uniform vec3 ink;
in float pointRadius;
in float pointSize;
out vec4 color;
void main() {
  vec2 offset=(gl_PointCoord-0.5)*pointSize;
  float area=3.14159265*pointRadius*pointRadius;
  float small=area*max(0.0,1.0-abs(offset.x))*max(0.0,1.0-abs(offset.y));
  float hard=step(length(offset),pointRadius);
  float coverage=mix(small,hard,smoothstep(0.35,0.75,pointRadius));
  if(coverage<=0.0) discard;
  color=vec4(ink,coverage);
}`;
function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}
function createRenderer() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  canvas.addEventListener("webglcontextrestored", () => {
    renderer = void 0;
    imageCache.clear();
  });
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms = Object.fromEntries(["size", "scale", "baseRadius", "gain", "seed"].map((name) => [name, gl.getUniformLocation(program, name)]));
  gl.uniform3f(gl.getUniformLocation(program, "ink"), 47 / 255, 79 / 255, 224 / 255);
  gl.clearColor(228 / 255, 229 / 255, 232 / 255, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  return { canvas, gl, uniforms };
}
function stippleImage({ type, width, height, density = 6, dotGain = 0.03, seed = 1234, scale = DEFAULT_SCALE } = {}) {
  if (typeof document === "undefined") return null;
  if (renderer === void 0) {
    try {
      renderer = createRenderer();
    } catch {
      renderer = null;
    }
  }
  if (!renderer) return null;
  const { canvas, gl, uniforms } = renderer;
  if (gl.isContextLost()) return null;
  const pitch = Math.max(3, Math.min(14, density)), gain = Math.max(-0.8, Math.min(0.2, dotGain));
  const baseRadius = (type === "sparse" ? 0.42 : 0.62) * (pitch / 6), coverage = type === "sparse" ? 0.025 : 0.28;
  const count = Math.round(width * height * coverage / (Math.PI * baseRadius * baseRadius));
  const key = [type, width, height, pitch, gain, seed, scale].join("/");
  if (imageCache.has(key)) return imageCache.get(key);
  const pixelsWide = Math.round(width * scale), pixelsHigh = Math.round(height * scale);
  if (pixelsWide > gl.getParameter(gl.MAX_TEXTURE_SIZE) || pixelsHigh > gl.getParameter(gl.MAX_TEXTURE_SIZE)) return null;
  canvas.width = pixelsWide;
  canvas.height = pixelsHigh;
  gl.viewport(0, 0, pixelsWide, pixelsHigh);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(uniforms.size, width, height);
  gl.uniform1f(uniforms.scale, scale);
  gl.uniform1f(uniforms.baseRadius, baseRadius);
  gl.uniform1f(uniforms.gain, gain);
  gl.uniform1ui(uniforms.seed, seed + (type === "dense" ? 104729 : 0) >>> 0);
  gl.drawArrays(gl.POINTS, 0, count);
  const image = { url: canvas.toDataURL("image/png"), count };
  if (imageCache.size >= 8) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(key, image);
  return image;
}

// dist/lab/screens.js
var screenTypes = ["dense", "am", "hatch", "cross", "coarse"];

// dist/lab/options.js
var ranges = {
  density: [3, 14],
  strokeWidth: [0.25, 0.75],
  patternAngle: [-90, 90],
  dotGain: [-0.8, 0.2],
  roughness: [0, 0.6],
  fontSize: [12, 18],
  curve: [0.1, 0.8],
  chartHeight: [120, 265],
  edgeFade: [0, 0.45],
  stageHeight: [250, 330],
  stageGap: [0, 20],
  proximityRadius: [0, 240],
  capCurve: [0, 20],
  borderRadius: [0, 20],
  tailRatio: [0.15, 1],
  isoDepth: [18, 200],
  isoRotation: [-45, 45],
  nodeGap: [28, 85],
  nodeWidth: [1, 6]
};
var defaultOptions = {
  texture: "mixed",
  density: 6,
  strokeWidth: 0.5,
  patternAngle: -45,
  dotGain: 0.03,
  roughness: 0.15,
  paperGrain: false,
  fontSize: 14,
  labels: true,
  guides: true,
  curve: 0.5,
  chartHeight: 235,
  edgeFade: 0,
  stageHeight: 310,
  stageGap: 9,
  capCurve: 12,
  borderRadius: 0,
  tailRatio: 0.65,
  nodeGap: 66,
  nodeWidth: 2.5
};
var verticalControlKeys = [
  "texture",
  "density",
  "strokeWidth",
  "patternAngle",
  "dotGain",
  "roughness",
  "fontSize",
  "labels",
  "paperGrain",
  "stageHeight",
  "stageGap",
  "proximityRadius",
  "capCurve",
  "borderRadius",
  "tailRatio",
  "isoDepth",
  "isoRotation"
];
var verticalSettings = (options) => Object.fromEntries(
  verticalControlKeys.map((key) => [key, options[key]])
);
function validateOption(key, value) {
  if (Object.hasOwn(ranges, key)) {
    const [min, max] = ranges[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}.`);
    }
  } else if (key === "texture") {
    if (!["mixed", ...screenTypes].includes(value)) throw new Error("Choose a supported screen pattern.");
  } else if (["labels", "guides", "paperGrain", "mirror"].includes(key)) {
    if (typeof value !== "boolean") throw new Error(`${key} must be true or false.`);
  } else if (key === "verticalView") {
    if (!["flat", "isometric"].includes(value)) throw new Error("Choose a flat or isometric vertical view.");
  } else {
    return false;
  }
  return true;
}
function normalizeOptions(input = {}, base = defaultOptions, { strict = true } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Options must be an object.");
  }
  const options = { ...base };
  for (const [key, value] of Object.entries(input)) {
    if (key === "verticalViews") continue;
    if (!validateOption(key, value)) {
      if (!strict) continue;
      throw new Error(`Unknown funnel option: ${key}.`);
    }
    options[key] = value;
  }
  if (input.verticalViews !== void 0) {
    const views = input.verticalViews;
    if (!views || typeof views !== "object" || Array.isArray(views) || !views.flat || !views.isometric) {
      throw new Error("Vertical controls need flat and isometric settings.");
    }
    options.verticalViews = {};
    for (const view of ["flat", "isometric"]) {
      const settings = views[view];
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        throw new Error(`${view} controls must be an object.`);
      }
      const resolved = verticalSettings(options);
      for (const [key, value] of Object.entries(settings)) {
        if (!verticalControlKeys.includes(key)) {
          if (strict) throw new Error(`Unknown ${view} control: ${key}.`);
          continue;
        }
        try {
          validateOption(key, value);
        } catch (error) {
          throw new Error(`${view} ${error.message}`);
        }
        resolved[key] = value;
      }
      options.verticalViews[view] = resolved;
    }
    Object.assign(options, options.verticalViews[options.verticalView ?? "flat"]);
  }
  return options;
}

// dist/core/data.js
function validateData(data, variant = "continuous") {
  if (!["continuous", "vertical", "branching"].includes(variant)) {
    throw new Error("Unknown funnel variant.");
  }
  if (variant !== "branching") {
    if (!Array.isArray(data) || data.length < 2) throw new Error("Provide at least two stages.");
    const ids2 = /* @__PURE__ */ new Set();
    data.forEach((stage, index) => {
      if (!stage || typeof stage.id !== "string" || !stage.id || typeof stage.label !== "string" || !stage.label || ids2.has(stage.id)) {
        throw new Error("Every stage needs a unique string id and a label.");
      }
      ids2.add(stage.id);
      if (!Number.isFinite(stage.value) || stage.value < 0) throw new Error("Stage values must be finite and nonnegative.");
      if (index && stage.value > data[index - 1].value) throw new Error("Conversion stages cannot increase in value.");
    });
    return data;
  }
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links) || data.nodes.length < 2 || !data.links.length) {
    throw new Error("Provide nodes and links for a branching funnel.");
  }
  const ids = /* @__PURE__ */ new Set();
  data.nodes.forEach((node) => {
    if (!node || typeof node.id !== "string" || !node.id || typeof node.label !== "string" || !node.label || ids.has(node.id)) {
      throw new Error("Every node needs a unique string id and a label.");
    }
    if (node.value !== void 0 && (!Number.isFinite(node.value) || node.value <= 0)) {
      throw new Error("Declared node quantities must be positive finite numbers.");
    }
    ids.add(node.id);
  });
  const incoming = new Map(data.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(incoming);
  const edges = /* @__PURE__ */ new Set();
  data.links.forEach((link) => {
    if (!link || !ids.has(link.source) || !ids.has(link.target) || link.source === link.target) {
      throw new Error("Links must connect two distinct existing nodes.");
    }
    if (!Number.isFinite(link.value) || link.value <= 0) throw new Error("Link quantities must be positive finite numbers.");
    const key = JSON.stringify([link.source, link.target]);
    if (edges.has(key)) throw new Error("Combine duplicate source/target links.");
    edges.add(key);
    incoming.set(link.target, incoming.get(link.target) + link.value);
    outgoing.set(link.source, outgoing.get(link.source) + link.value);
  });
  for (const node of data.nodes) {
    if (!incoming.get(node.id) && !outgoing.get(node.id)) throw new Error("Every node must be connected.");
    if (incoming.get(node.id) && outgoing.get(node.id) > incoming.get(node.id) + 1e-8) {
      throw new Error(`Outgoing flow exceeds incoming flow at ${node.label}.`);
    }
  }
  const pending = new Set(ids);
  const done = /* @__PURE__ */ new Set();
  while (pending.size) {
    const ready = [...pending].filter((id) => data.links.filter((link) => link.target === id).every((link) => done.has(link.source)));
    if (!ready.length) throw new Error("Branching funnels must be acyclic.");
    ready.forEach((id) => {
      done.add(id);
      pending.delete(id);
    });
  }
  return data;
}

// src/chart/shared.ts
var screenTypes2 = ["dense", "am", "hatch", "cross", "coarse"];
var fmt = (n) => new Intl.NumberFormat("en-US").format(n);
var pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : "\u2014";
function createModel(variant, width, height) {
  return { variant, width, height, marks: [], clips: [], fadeStops: {} };
}
function createMarkHelpers(model, texture) {
  const marks = model.marks;
  const addText = (key, x, y, value, size = 13, anchor = "start") => marks.push({ type: "text", key, x, y, text: value, fontSize: size, anchor });
  const addLine = (key, x1, y1, x2, y2, strokeWidth, dash, baseline) => marks.push({ type: "line", key, x1, y1, x2, y2, strokeWidth, dash, baseline });
  const fillTypes = [];
  const chooseScreen = (i, neighbors = []) => {
    if (texture !== "mixed") return texture;
    const used = new Set(neighbors.map((key) => fillTypes[key]));
    let type = screenTypes2[i % screenTypes2.length];
    for (let j = 0; j < screenTypes2.length; j++) {
      const candidate = screenTypes2[(i + j) % screenTypes2.length];
      if (!used.has(candidate)) {
        type = candidate;
        break;
      }
    }
    fillTypes[i] = type;
    return type;
  };
  return { marks, addText, addLine, chooseScreen };
}

// src/chart/continuous.ts
function edgeFadeStops(fade, side = "both") {
  if (!fade) return [[0, 1], [1, 1]];
  const ramp = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return [fade * t, +(t * t * (3 - 2 * t)).toFixed(4)];
  });
  const left = [...ramp, [1, 1]];
  const right = [[0, 1], ...ramp.slice().reverse().map(([offset, alpha]) => [1 - offset, alpha])];
  return side === "left" ? left : side === "right" ? right : [...ramp, [1 - fade, 1], ...right.slice(2)];
}
function continuousModel(stageData, options = {}) {
  const {
    texture = "mixed",
    strokeWidth = 0.5,
    labels = true,
    curve = 0.5,
    chartHeight = 235,
    edgeFade = 0,
    mirror = false,
    guides = true,
    fontSize = 14
  } = options;
  const model = createModel("continuous", 900, 460);
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, max = stageData[0].value || 1;
  if (edgeFade > 0) for (const side of ["left", "right", "both"]) model.fadeStops[side] = edgeFadeStops(edgeFade, side);
  const step = 790 / (stageData.length - 1), base = 365, center = base - chartHeight / 2;
  if (guides) {
    const marks2 = mirror ? [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75, 1].map((ratio, i) => [center + (i - 4) * chartHeight / 8, ratio]) : [0, 0.25, 0.5, 0.75, 1].map((ratio) => [base - chartHeight * ratio, ratio]);
    for (const [i, [y, ratio]] of marks2.entries()) {
      addLine(`scale:${i}:tick`, 38, y, 46, y, 0.4);
      addText(`scale:${i}:label`, 31, y + 3, `${Math.round(ratio * 100)}`, 10, "end");
    }
    addText("scale:unit", 31, base - chartHeight - 13, "%", 10, "end");
  }
  stageData.forEach((s, i) => {
    const x = 50 + i * step, h = s.value / max * chartHeight, top = mirror ? center - h / 2 : base - h, bottom = mirror ? center + h / 2 : base;
    if (guides) addLine(`stage:${s.id}:guide`, x, 96, x, 386, void 0, "2 5");
    if (labels) {
      const anchor = i === stageData.length - 1 ? "end" : "start";
      addText(`stage:${s.id}:label`, x, 59, s.label, fontSize, anchor);
      addText(`stage:${s.id}:value`, x, 81, fmt(s.value), fontSize - 2, anchor);
    }
    if (i < stageData.length - 1) {
      const next = stageData[i + 1], h2 = next.value / max * chartHeight, top2 = mirror ? center - h2 / 2 : base - h2, bottom2 = mirror ? center + h2 / 2 : base;
      const xx = x + step, c = step * curve;
      const d = mirror ? `M ${x} ${top} C ${x + c} ${top} ${xx - c} ${top2} ${xx} ${top2} L ${xx} ${bottom2} C ${xx - c} ${bottom2} ${x + c} ${bottom} ${x} ${bottom} Z` : `M ${x} ${top} C ${x + c} ${top} ${xx - c} ${top2} ${xx} ${top2} L ${xx} ${base} L ${x} ${base} Z`;
      const maskSide = edgeFade > 0 ? i === 0 && i === stageData.length - 2 ? "both" : i === 0 ? "left" : i === stageData.length - 2 ? "right" : void 0 : void 0;
      const inspection = { key: s.id, label: `${s.label} \u2192 ${next.label}`, value: next.value, denominator: s.value, total: max, kind: "stage" };
      marks.push({ type: "path", key: s.id, d, pattern: chooseScreen(i), stroke: true, strokeWidth: sw, inspection, maskSide });
    }
    addText(`stage:${s.id}:ratio`, x, 417, `${String(i + 1).padStart(2, "0")} / ${pct(s.value, max)}`, 12, i === stageData.length - 1 ? "end" : "start");
  });
  if (!mirror && !edgeFade) addLine("baseline", 50, 365, 840, 365, sw, void 0, true);
  return model;
}

// src/chart/vertical.ts
function verticalRimGeometry(data, { stageHeight = 310, stageGap = 9, tailRatio = 0.65, borderRadius = 0 } = {}) {
  const max = data[0].value || 1, visibleHeight = Math.max(0, stageHeight / data.length - stageGap);
  const widths = [...data.map((stage) => 460 * stage.value / max), 460 * data[data.length - 1].value * tailRatio / max];
  const radii = widths.map((width) => Math.min(borderRadius, width / 4, visibleHeight / 3));
  return { widths, radii };
}
var lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
var quad = (a, b, c, t) => lerp(lerp(a, b, t), lerp(b, c, t), t);
var point = (p) => `${p.x} ${p.y}`;
function trimmed(a, b, c, start, end) {
  const p = quad(a, b, c, start), q = quad(a, b, c, end), t = end - start;
  return { p, q, control: { x: p.x + t * ((1 - start) * (b.x - a.x) + start * (c.x - b.x)), y: p.y + t * ((1 - start) * (b.y - a.y) + start * (c.y - b.y)) } };
}
function intersection(a, u, b, v, fallback) {
  const cross = u.x * v.y - u.y * v.x;
  if (Math.abs(cross) < 1e-8) return fallback;
  const t = ((b.x - a.x) * v.y - (b.y - a.y) * v.x) / cross;
  return { x: a.x + t * u.x, y: a.y + t * u.y };
}
var tangent = (a, b, c, t) => ({ x: (1 - t) * (b.x - a.x) + t * (c.x - b.x), y: (1 - t) * (b.y - a.y) + t * (c.y - b.y) });
function verticalContainerGeometry(data, options, index) {
  const center = 390, height = options.stageHeight / data.length, y = 70 + index * height, max = data[0].value || 1;
  const width = 460 * data[index].value / max, lowerWidth = 460 * (data[index + 1]?.value ?? data[index].value * options.tailRatio) / max, bottom = y + height - options.stageGap;
  const a = { x: center - width / 2, y }, b = { x: center + width / 2, y }, c = { x: center + lowerWidth / 2, y: bottom }, d = { x: center - lowerWidth / 2, y: bottom };
  const topControl = { x: center, y: y + options.capCurve }, bottomControl = { x: center, y: bottom + options.capCurve / 4 };
  const radius = Math.min(options.borderRadius, (bottom - y) * 0.25, Math.min(width, lowerWidth) * 0.2);
  const side = Math.hypot(c.x - b.x, c.y - b.y), u = width ? radius / width : 0, v = lowerWidth ? radius / lowerWidth : 0, s = side ? radius / side : 0;
  const top = trimmed(a, topControl, b, u, 1 - u), base = trimmed(c, bottomControl, d, v, 1 - v);
  const rightStart = lerp(b, c, s), rightEnd = lerp(b, c, 1 - s), leftStart = lerp(d, a, s), leftEnd = lerp(d, a, 1 - s);
  const rightVector = { x: c.x - b.x, y: c.y - b.y }, leftVector = { x: a.x - d.x, y: a.y - d.y };
  const tr = intersection(top.q, tangent(a, topControl, b, 1 - u), rightStart, rightVector, b);
  const br = intersection(rightEnd, rightVector, base.p, tangent(c, bottomControl, d, v), c);
  const bl = intersection(base.q, tangent(c, bottomControl, d, 1 - v), leftStart, leftVector, d);
  const tl = intersection(leftEnd, leftVector, top.p, tangent(a, topControl, b, u), a);
  const path = `M ${point(top.p)} Q ${point(top.control)} ${point(top.q)} Q ${point(tr)} ${point(rightStart)} L ${point(rightEnd)} Q ${point(br)} ${point(base.p)} Q ${point(base.control)} ${point(base.q)} Q ${point(bl)} ${point(leftStart)} L ${point(leftEnd)} Q ${point(tl)} ${point(top.p)} Z`;
  return {
    path,
    y,
    bottom,
    height: bottom - y,
    width,
    lowerWidth,
    radius,
    centerX: center,
    centerY: (y + bottom) / 2,
    topLeft: top.p.x,
    topRight: top.q.x,
    bottomLeft: base.q.x,
    bottomRight: base.p.x
  };
}
function roundedPolygonPath(points, radius) {
  if (!radius) return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;
  const corners = points.map((point2, i) => {
    const previous = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const before = Math.hypot(point2.x - previous.x, point2.y - previous.y), after = Math.hypot(next.x - point2.x, next.y - point2.y);
    const trim = Math.min(radius, before / 2, after / 2);
    return { point: point2, entry: { x: point2.x + (previous.x - point2.x) * trim / before, y: point2.y + (previous.y - point2.y) * trim / before }, exit: { x: point2.x + (next.x - point2.x) * trim / after, y: point2.y + (next.y - point2.y) * trim / after } };
  });
  return `M ${corners[0].entry.x} ${corners[0].entry.y} ${corners.map(({ point: point2, exit }, i) => `Q ${point2.x} ${point2.y} ${exit.x} ${exit.y} L ${corners[(i + 1) % corners.length].entry.x} ${corners[(i + 1) % corners.length].entry.y}`).join(" ")} Z`;
}
function isometricStageGeometry(data, { stageHeight = 310, stageGap = 20, tailRatio = 0.65, isoDepth = 36, isoRotation = 30, borderRadius = 0 } = {}) {
  const angle = isoRotation * Math.PI / 180, baseline = Math.cos(Math.PI / 6);
  const dx = isoDepth * Math.sin(angle) / 0.5, rise = isoDepth * Math.cos(angle) / (baseline * Math.sqrt(3));
  const { widths: linearWidths } = verticalRimGeometry(data, { stageHeight, stageGap, tailRatio });
  const widths = linearWidths.map((width) => width * Math.cos(angle) / baseline);
  if (widths.some((width, i) => i > 0 && width >= widths[i - 1])) throw new Error("Isometric stages need decreasing quantities and a terminal taper below 100%.");
  const center = 360 + Math.max(0, 60 - (360 - widths[0] / 2 + Math.min(0, dx))), topY = Math.max(70, rise + 20);
  const scale = stageHeight / (widths[0] - widths[widths.length - 1]);
  const rimY = widths.map((width) => topY + (widths[0] - width) * scale);
  return data.map((stage, i) => {
    const y = rimY[i], nextY = rimY[i + 1], gap = i < data.length - 1 ? Math.min(stageGap, (nextY - y) * 0.65) : 0, bottom = nextY - gap;
    const bottomWidth = widths[0] - (bottom - topY) / scale, left = center - widths[i] / 2, right = center + widths[i] / 2;
    const leftBottom = center - bottomWidth / 2, rightBottom = center + bottomWidth / 2;
    const outlinePoints = dx >= 0 ? [
      { x: left, y },
      { x: left + dx, y: y - rise },
      { x: right + dx, y: y - rise },
      { x: rightBottom + dx, y: bottom - rise },
      { x: rightBottom, y: bottom },
      { x: leftBottom, y: bottom }
    ] : [
      { x: right, y },
      { x: right + dx, y: y - rise },
      { x: left + dx, y: y - rise },
      { x: leftBottom + dx, y: bottom - rise },
      { x: leftBottom, y: bottom },
      { x: rightBottom, y: bottom }
    ];
    return {
      key: stage.id,
      y,
      bottom,
      right,
      outerRight: right + Math.max(0, dx),
      topWidth: widths[i],
      bottomWidth,
      centerX: center + dx / 2,
      centerY: (y + bottom - rise) / 2,
      outline: roundedPolygonPath(outlinePoints, borderRadius),
      front: `M ${left} ${y} L ${right} ${y} L ${rightBottom} ${bottom} L ${leftBottom} ${bottom} Z`,
      top: `M ${left} ${y} L ${left + dx} ${y - rise} L ${right + dx} ${y - rise} L ${right} ${y} Z`,
      side: dx >= 0 ? `M ${right} ${y} L ${right + dx} ${y - rise} L ${rightBottom + dx} ${bottom - rise} L ${rightBottom} ${bottom} Z` : `M ${left} ${y} L ${left + dx} ${y - rise} L ${leftBottom + dx} ${bottom - rise} L ${leftBottom} ${bottom} Z`
    };
  });
}
function verticalModel(stageData, options = {}) {
  const {
    texture = "mixed",
    strokeWidth = 0.5,
    labels = true,
    stageHeight = 310,
    stageGap = 9,
    capCurve = 12,
    borderRadius = 0,
    tailRatio = 0.65,
    verticalView = "isometric",
    isoDepth = 36,
    isoRotation = 30,
    fontSize = 14
  } = options;
  const stages = verticalView === "isometric" ? isometricStageGeometry(stageData, { stageHeight, stageGap, tailRatio, isoDepth, isoRotation, borderRadius }) : void 0;
  const annotationX = stages ? Math.max(670, Math.ceil(stages[0].outerRight + 56)) : 670;
  const height = stages ? Math.max(460, Math.ceil(stages[stages.length - 1].bottom + 60)) : 460;
  const width = stages ? Math.max(900, annotationX + 230) : 900;
  const model = createModel("vertical", width, height);
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, max = stageData[0].value || 1;
  if (stages) {
    if (borderRadius) stages.forEach((stage, i) => model.clips.push({ id: `stage-clip-${i}`, d: stage.outline }));
    stages.forEach((stage, i) => {
      const clipId = borderRadius ? `stage-clip-${i}` : void 0;
      marks.push({ type: "path", key: `stage:${stage.key}:side`, d: stage.side, pattern: "cross", stroke: true, strokeWidth: sw, clipId, face: "side", stageId: stage.key });
      marks.push({ type: "path", key: `stage:${stage.key}:top`, d: stage.top, pattern: "sparse", stroke: true, strokeWidth: sw, clipId, face: "top", stageId: stage.key });
    });
    stages.forEach((stage, i) => {
      const s = stageData[i], clipId = borderRadius ? `stage-clip-${i}` : void 0;
      const inspection = { key: s.id, label: s.label, value: s.value, denominator: stageData[i - 1]?.value ?? max, total: max, kind: "stage" };
      marks.push({
        type: "path",
        key: s.id,
        d: stage.front,
        pattern: chooseScreen(i),
        stroke: true,
        strokeWidth: sw,
        clipId,
        inspection,
        focus: { x: stage.centerX, y: stage.centerY }
      });
      if (borderRadius) marks.push({ type: "path", key: `stage:${s.id}:outline`, d: stage.outline, fill: "none", stroke: true, strokeWidth: sw, lineJoin: "round", outline: true, stageId: s.id });
    });
    if (labels) stages.forEach((stage, i) => {
      const s = stageData[i], mid = (stage.y + stage.bottom) / 2;
      addText(`stage:${s.id}:number`, 52, mid, String(i + 1).padStart(2, "0"), 12);
      addLine(`stage:${s.id}:leader`, stage.outerRight + 12, mid, annotationX - 15, mid, 0.5, "2 3");
      addText(`stage:${s.id}:label`, annotationX, mid - 4, s.label, fontSize);
      addText(`stage:${s.id}:value`, annotationX, mid + 15, `${fmt(s.value)} \xB7 ${pct(s.value, max)}`, fontSize - 2);
    });
    return model;
  }
  stageData.forEach((s, i) => {
    const geometry = verticalContainerGeometry(stageData, { stageHeight, stageGap, tailRatio, capCurve, borderRadius }, i);
    const inspection = { key: s.id, label: s.label, value: s.value, denominator: stageData[i - 1]?.value ?? max, total: max, kind: "stage" };
    marks.push({
      type: "path",
      key: s.id,
      d: geometry.path,
      pattern: chooseScreen(i),
      stroke: true,
      strokeWidth: sw,
      inspection,
      focus: { x: geometry.centerX, y: geometry.centerY }
    });
    if (labels) {
      const mid = geometry.y + stageHeight / stageData.length / 2;
      addText(`stage:${s.id}:number`, 52, mid, String(i + 1).padStart(2, "0"), 12);
      addLine(`stage:${s.id}:leader`, 390 + geometry.width / 2 + 12, mid, 655, mid, 0.5, "2 3");
      addText(`stage:${s.id}:label`, 670, mid - 4, s.label, fontSize);
      addText(`stage:${s.id}:value`, 670, mid + 15, `${fmt(s.value)} \xB7 ${pct(s.value, max)}`, fontSize - 2);
    }
  });
  return model;
}

// src/chart/branching.ts
function layoutGraph(data, { nodeGap = 66, nodeWidth = 2.5 } = {}) {
  validateData(data, "branching");
  const nodes = data.nodes.map((n) => ({ ...n, value: n.value ?? 0, incoming: [], outgoing: [], level: 0, height: 0, span: 0, x: 0, y: 0 }));
  const map = new Map(nodes.map((n) => [n.id, n]));
  const links = data.links.map((l) => ({
    ...l,
    id: `link:${encodeURIComponent(l.source)}:${encodeURIComponent(l.target)}`,
    sourceNode: map.get(l.source),
    targetNode: map.get(l.target),
    width: 0,
    sy: 0,
    ty: 0
  }));
  links.forEach((l) => {
    l.sourceNode.outgoing.push(l);
    l.targetNode.incoming.push(l);
  });
  const roots = nodes.filter((n) => !n.incoming.length);
  if (roots.length !== 1) throw new Error("Use one entry bucket for a branching funnel.");
  for (const n of nodes) {
    if (n.incoming.length > 1) throw new Error(`${n.label} has more than one parent. Give each branch its own child bucket.`);
    const incoming = n.incoming.reduce((sum, l) => sum + l.value, 0);
    const outgoing = n.outgoing.reduce((sum, l) => sum + l.value, 0);
    const quantity = incoming || outgoing;
    if (n.value && Math.abs(n.value - quantity) > 1e-8 * Math.max(1, n.value))
      throw new Error(`${n.label}: links account for ${fmt(quantity)} of the declared ${fmt(n.value)}. Every split must account for 100%.`);
    n.value = quantity;
    if (n.incoming.length && n.outgoing.length && Math.abs(incoming - outgoing) > 1e-8 * Math.max(1, incoming))
      throw new Error(`${n.label} distributes ${fmt(outgoing)} of ${fmt(incoming)}. Its children must account for 100%; add a remaining or drop-off bucket.`);
  }
  const root = roots[0];
  if (nodes.some((n) => n !== root && !n.incoming.length)) throw new Error("Branching funnels need one connected bucket tree.");
  const total = root.value, scale = 240 / total;
  const visited = /* @__PURE__ */ new Set();
  const measure = (n, level) => {
    visited.add(n.id);
    n.level = level;
    n.height = n.value * scale;
    n.span = Math.max(n.height, n.outgoing.reduce((sum, l) => sum + measure(l.targetNode, level + 1), 0) + Math.max(0, n.outgoing.length - 1) * nodeGap);
    return n.span;
  };
  measure(root, 0);
  if (visited.size !== nodes.length) throw new Error("Branching funnels need one connected bucket tree.");
  const place = (n, top) => {
    n.y = top + (n.span - n.height) / 2;
    const childrenHeight = n.outgoing.reduce((sum, l) => sum + l.targetNode.span, 0) + Math.max(0, n.outgoing.length - 1) * nodeGap;
    let y = top + (n.span - childrenHeight) / 2;
    n.outgoing.forEach((l) => {
      place(l.targetNode, y);
      y += l.targetNode.span + nodeGap;
    });
  };
  place(root, 110);
  const bottom = 110 + root.span, depth = Math.max(...nodes.map((n) => n.level));
  const width = Math.max(900, 100 + depth * 160), columnStep = (width - 100) / depth;
  nodes.forEach((n) => {
    n.x = 50 + n.level * columnStep;
    let sy = n.y;
    n.outgoing.forEach((l) => {
      l.width = l.value * scale;
      l.sy = sy;
      l.ty = l.targetNode.y;
      sy += l.width;
    });
  });
  return { nodes, links, total, depth, bottom, height: Math.max(405, Math.ceil(bottom + 55)), width, columnStep, nodeWidth };
}
function branchingModel(data, options = {}) {
  const {
    texture = "mixed",
    strokeWidth = 0.5,
    labels = true,
    curve = 0.5,
    nodeGap = 66,
    nodeWidth = 2.5,
    fontSize = 14,
    guides = true
  } = options;
  const graph = layoutGraph(data, { nodeGap, nodeWidth });
  const model = createModel("branching", graph.width, graph.height);
  model.graph = graph;
  const { marks, addText, addLine, chooseScreen } = createMarkHelpers(model, texture);
  const sw = strokeWidth * 4 / 3, height = model.height;
  for (let i = 0; i <= graph.depth; i++) {
    const x = 50 + i * graph.columnStep;
    addText(`column:${i}:heading`, x, 30, `0${i + 1} / ${i === 0 ? "ENTRY" : i === graph.depth ? "OUTCOME" : "BRANCH"}`, 11, i === graph.depth ? "end" : "start");
    if (guides) addLine(`column:${i}:guide`, x, 48, x, height - 3, void 0, "2 5");
  }
  graph.links.forEach((link, i) => {
    const x = link.sourceNode.x + nodeWidth, xx = link.targetNode.x, c = (xx - x) * curve;
    const d = `M ${x} ${link.sy} C ${x + c} ${link.sy} ${xx - c} ${link.ty} ${xx} ${link.ty} L ${xx} ${link.ty + link.width} C ${xx - c} ${link.ty + link.width} ${x + c} ${link.sy + link.width} ${x} ${link.sy + link.width} Z`;
    const neighbors = graph.links.slice(0, i).flatMap((prev, j) => prev.source === link.source || prev.target === link.target || prev.target === link.source || prev.source === link.target ? [j] : []);
    const inspection = { key: link.id, label: `${link.sourceNode.label} \u2192 ${link.targetNode.label}`, value: link.value, denominator: link.sourceNode.value, total: graph.total, source: link.source, target: link.target, kind: "link" };
    marks.push({ type: "path", key: link.id, d, pattern: chooseScreen(i, neighbors), stroke: true, strokeWidth: sw, inspection });
  });
  graph.nodes.forEach((node) => {
    marks.push({ type: "rect", key: `node:${node.id}`, x: node.x, y: node.y, width: nodeWidth, height: node.height, pattern: "solid", stroke: true, strokeWidth: 0.35 });
    if (labels) {
      const anchor = node.level === graph.depth ? "end" : "start";
      addText(`node:${node.id}:label`, node.x, node.y - 25, node.label, fontSize, anchor);
      addText(`node:${node.id}:value`, node.x, node.y - 7, fmt(node.value), fontSize - 2, anchor);
    }
  });
  return model;
}

// src/chart/model.ts
function buildChartModel(data, variant, options = {}) {
  if (!["continuous", "vertical", "branching"].includes(variant)) throw new Error("Unknown funnel variant.");
  validateData(data, variant);
  const texture = options.texture ?? "mixed";
  if (!["mixed", ...screenTypes2].includes(texture)) throw new Error("Choose a supported screen pattern.");
  if (variant === "continuous") {
    if (typeof (options.mirror ?? false) !== "boolean") throw new Error("mirror must be true or false.");
    return continuousModel(data, options);
  }
  if (variant === "vertical") {
    if (!["flat", "isometric"].includes(options.verticalView ?? "isometric")) throw new Error("Choose a flat or isometric vertical view.");
    return verticalModel(data, options);
  }
  return branchingModel(data, options);
}

// src/react/ScreenDefs.tsx
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var INK = "#2F4FE0";
var PAPER = "#E4E5E8";
var TILE_SIZE = 128;
var renderStipple = stippleImage;
var screenTypes3 = ["dense", "am", "hatch", "cross", "coarse", "solid", "grain"];
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 1831565813;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
var stippleCache = /* @__PURE__ */ new Map();
function stippleField(type, width, height, pitch, seed) {
  const key = [type, width, height, pitch, seed].join("/");
  const cached = stippleCache.get(key);
  if (cached) return cached;
  const baseRadius = (type === "sparse" ? 0.42 : 0.62) * (pitch / 6);
  const coverage = type === "sparse" ? 0.025 : 0.28;
  const count = Math.round(width * height * coverage / (Math.PI * baseRadius * baseRadius));
  const random = seededRandom(seed + (type === "dense" ? 104729 : 0));
  const groups = Array.from({ length: 6 }, (_, index) => ({ radius: baseRadius * (0.8 + index * 0.08), commands: [] }));
  for (let index = 0; index < count; index++) {
    const x = (random() * width).toFixed(2);
    const y = (random() * height).toFixed(2);
    groups[Math.floor(random() * groups.length)].commands.push(`M${x} ${y}h.01`);
  }
  const field = { count, groups: groups.map(({ radius, commands }) => ({ radius, d: commands.join("") })) };
  if (stippleCache.size >= 24) stippleCache.delete(stippleCache.keys().next().value);
  stippleCache.set(key, field);
  return field;
}
function ScreenDefs({
  idPrefix,
  width,
  height,
  density = 6,
  patternAngle = -45,
  dotGain = 0.03,
  roughness = 0.15,
  seed = 1234,
  includeSparse = false,
  stippleScale = 2
}) {
  const pitch = Math.max(3, Math.min(14, density));
  const gain = Math.max(-0.8, Math.min(0.2, dotGain));
  const types = includeSparse ? [...screenTypes3, "sparse"] : screenTypes3;
  const imageKey = [width, height, pitch, dotGain, seed, includeSparse, stippleScale].join("/");
  const [images, setImages] = useState(null);
  useEffect(() => {
    const dense = renderStipple({ type: "dense", width, height, density: pitch, dotGain, seed, scale: stippleScale });
    const sparse = includeSparse ? renderStipple({ type: "sparse", width, height, density: pitch, dotGain, seed, scale: stippleScale }) : null;
    if (dense || sparse) setImages({ key: imageKey, dense: dense ?? void 0, sparse: sparse ?? void 0 });
  }, [imageKey, width, height, pitch, dotGain, seed, includeSparse, stippleScale]);
  return /* @__PURE__ */ jsxs("defs", { children: [
    types.map((type, index) => {
      const stochastic = type === "dense" || type === "sparse";
      const size = type === "coarse" ? pitch * 1.8 : type === "grain" ? 128 : pitch;
      const image = stochastic && images?.key === imageKey ? images[type] : void 0;
      const patternWidth = stochastic ? image ? width : Math.min(width, TILE_SIZE) : size;
      const patternHeight = stochastic ? image ? height : Math.min(height, TILE_SIZE) : size;
      const random = seededRandom(seed + index * 104729);
      const field = stochastic && !image ? stippleField(type, patternWidth, patternHeight, pitch, seed) : null;
      const patternTransform = type === "hatch" || type === "cross" ? `rotate(${patternAngle})` : void 0;
      return /* @__PURE__ */ jsxs(
        "pattern",
        {
          id: `${idPrefix}-${type}`,
          width: patternWidth,
          height: patternHeight,
          patternUnits: "userSpaceOnUse",
          patternTransform,
          "data-dot-count": image?.count ?? field?.count,
          "data-stipple-renderer": image ? "shader" : field ? "vector" : void 0,
          children: [
            /* @__PURE__ */ jsx("rect", { width: patternWidth, height: patternHeight, fill: PAPER }),
            image && /* @__PURE__ */ jsx("image", { width: patternWidth, height: patternHeight, href: image.url, preserveAspectRatio: "none" }),
            field?.groups.map((group, groupIndex) => /* @__PURE__ */ jsx(
              "path",
              {
                d: group.d,
                fill: "none",
                stroke: INK,
                strokeWidth: group.radius * 2 * (1 + gain),
                strokeLinecap: "round"
              },
              groupIndex
            )),
            (type === "am" || type === "coarse") && /* @__PURE__ */ jsx(
              "circle",
              {
                cx: size / 2,
                cy: size / 2,
                r: size * Math.sqrt((type === "am" ? 0.3 : 0.7) / Math.PI) * (1 + dotGain),
                fill: INK
              }
            ),
            type === "hatch" && /* @__PURE__ */ jsx("path", { d: `M 0 ${size / 2} H ${size}`, stroke: INK, strokeWidth: size * 0.5 * (1 + dotGain) }),
            type === "cross" && /* @__PURE__ */ jsx(
              "path",
              {
                d: `M 0 ${size / 2} H ${size} M ${size / 2} 0 V ${size}`,
                stroke: INK,
                strokeWidth: size * (1 - Math.sqrt(0.5)) * (1 + dotGain)
              }
            ),
            type === "solid" && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("rect", { width: size, height: size, fill: INK }),
              roughness > 0 && Array.from({ length: 3 }, (_, pointIndex) => /* @__PURE__ */ jsx(
                "circle",
                {
                  cx: random() * size,
                  cy: random() * size,
                  r: roughness * 0.6,
                  fill: PAPER
                },
                pointIndex
              ))
            ] }),
            type === "grain" && Array.from({ length: 190 }, (_, pointIndex) => /* @__PURE__ */ jsx(
              "circle",
              {
                cx: random() * size,
                cy: random() * size,
                r: 0.08 + random() * 0.09,
                fill: INK
              },
              pointIndex
            ))
          ]
        },
        type
      );
    }),
    roughness > 0 && /* @__PURE__ */ jsxs(
      "filter",
      {
        id: `${idPrefix}-edge`,
        x: "-5%",
        y: "-5%",
        width: "110%",
        height: "110%",
        colorInterpolationFilters: "sRGB",
        children: [
          /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: ".28", numOctaves: 2, seed: seed % 9997, result: "noise" }),
          /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "noise", scale: roughness, xChannelSelector: "R", yChannelSelector: "G" })
        ]
      }
    )
  ] });
}

// src/react/AtlasFunnel.tsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var PAPER2 = "#E4E5E8";
var INK2 = "#2F4FE0";
var emptyOptions = Object.freeze({});
var StableScreenDefs = memo(ScreenDefs);
var format = (value) => new Intl.NumberFormat("en-US").format(value);
var percent = (value, total) => total ? `${(100 * value / total).toFixed(1)}%` : "\u2014";
function proximityAt(svg, x, y, radius) {
  let key = null, distance = Infinity;
  svg.querySelectorAll("[data-hit-stage]").forEach((hit) => {
    const bounds = hit.getBoundingClientRect();
    const dx = Math.max(bounds.left - x, 0, x - bounds.right);
    const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
    const next = Math.hypot(dx, dy);
    if (next < distance) {
      distance = next;
      key = hit.getAttribute("data-key");
    }
  });
  const raw = radius ? Math.max(0, 1 - distance / radius) : Number(distance === 0);
  return raw > 0 ? { key, progress: raw * raw * (3 - 2 * raw) } : { key: null, progress: 0 };
}
function crossfadeDurationMs(svg) {
  const value = window.getComputedStyle(svg).getPropertyValue("--atlas-crossfade-duration").trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 150;
  if (value.endsWith("ms")) return amount;
  if (value.endsWith("s")) return amount * 1e3;
  return 150;
}
function paintVerticalFocus(svg, stages, key, progress, heldFocusKey) {
  const selectedIndex = stages.findIndex((stage) => stage.id === key);
  const strength = selectedIndex < 0 ? 0 : progress;
  svg.querySelectorAll(".atlas-vertical-stage").forEach((group) => {
    const index = Number(group.getAttribute("data-stage-index"));
    const selected = index === selectedIndex;
    group.style.transform = !strength || selected ? "none" : `translateY(${(index < selectedIndex ? -22 : 22) * strength}px) scale(${1 - 0.02 * strength})`;
    group.style.opacity = String(!strength ? 1 : selected ? 0 : 1 - 0.72 * strength);
  });
  svg.querySelectorAll(".atlas-vertical-focus").forEach((group) => {
    if (group.getAttribute("data-stage-focus") === heldFocusKey) return;
    const index = Number(group.getAttribute("data-stage-index"));
    const selected = index === selectedIndex && strength > 0;
    const ratio = stages[index].value / (stages[0]?.value || 1);
    const zoom = 1.06 + 0.36 * (1 - ratio);
    group.style.transform = selected ? `scale(${1 + (zoom - 1) * strength})` : "none";
    group.style.opacity = selected ? "1" : "0";
    group.toggleAttribute("data-visible", selected);
  });
  svg.querySelectorAll(".atlas-vertical-annotation").forEach((group) => {
    group.style.opacity = String(!strength || group.getAttribute("data-stage-annotation") === key ? 1 : 1 - 0.6 * strength);
  });
}
function connectedLinks(model, key) {
  const active = model.marks.find((mark) => mark.type === "path" && mark.inspection?.key === key);
  if (!active || active.type !== "path" || active.inspection?.kind !== "link") return /* @__PURE__ */ new Set([key]);
  const links = model.marks.flatMap((mark) => mark.type === "path" && mark.inspection?.kind === "link" ? [mark.inspection] : []);
  const linked = /* @__PURE__ */ new Set([key]);
  const walk = (nodeId, upstream, seen = /* @__PURE__ */ new Set()) => {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    for (const link of links) {
      if (upstream ? link.target === nodeId : link.source === nodeId) {
        linked.add(link.key);
        walk(upstream ? link.source : link.target, upstream, seen);
      }
    }
  };
  walk(active.inspection.source, true);
  walk(active.inspection.target, false);
  return linked;
}
function Mark({ mark, idPrefix, activeKey, visibleKeys, roughness, onPreview, onLeave, verticalStage = false }) {
  if (mark.type === "line") return /* @__PURE__ */ jsx2(
    "line",
    {
      x1: mark.x1,
      y1: mark.y1,
      x2: mark.x2,
      y2: mark.y2,
      stroke: INK2,
      strokeWidth: mark.strokeWidth,
      strokeDasharray: mark.dash,
      "data-ink-baseline": mark.baseline ? "" : void 0
    }
  );
  if (mark.type === "rect") return /* @__PURE__ */ jsx2(
    "rect",
    {
      x: mark.x,
      y: mark.y,
      width: mark.width,
      height: mark.height,
      fill: mark.pattern === "paper" ? PAPER2 : `url(#${idPrefix}-${mark.pattern ?? "solid"})`,
      stroke: mark.stroke ? INK2 : void 0,
      strokeWidth: mark.strokeWidth
    }
  );
  if (mark.type === "text") return /* @__PURE__ */ jsx2(
    "text",
    {
      x: mark.x,
      y: mark.y,
      fill: INK2,
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: mark.fontSize,
      textAnchor: mark.anchor,
      children: mark.text
    }
  );
  const baseFill = mark.fill === "none" ? "none" : mark.pattern === "paper" ? PAPER2 : `url(#${idPrefix}-${mark.pattern ?? "solid"})`;
  const inspection = mark.inspection;
  const visible = !activeKey || (inspection ? visibleKeys ? visibleKeys.has(inspection.key) : activeKey === inspection.key : mark.stageId ? activeKey === mark.stageId : true);
  const fill = verticalStage || visible ? baseFill : PAPER2;
  const clipPath = mark.clipId ? `url(#${idPrefix}-${mark.clipId})` : void 0;
  const mask = mark.maskSide ? `url(#${idPrefix}-fade-${mark.maskSide})` : void 0;
  const stroke = mark.stroke === false ? void 0 : INK2;
  return /* @__PURE__ */ jsx2(Fragment2, { children: /* @__PURE__ */ jsx2(
    "path",
    {
      d: mark.d,
      fill,
      stroke,
      strokeWidth: mark.strokeWidth,
      strokeLinejoin: mark.lineJoin,
      strokeDasharray: inspection && !verticalStage && !visible ? "2 4" : void 0,
      clipPath,
      mask,
      filter: inspection && roughness > 0 ? `url(#${idPrefix}-edge)` : void 0,
      "data-base-fill": baseFill,
      "data-key": !verticalStage ? inspection?.key : void 0,
      "data-stage-front": verticalStage ? inspection?.key : void 0,
      "data-stage-face": mark.face ? mark.stageId : void 0,
      "data-face": mark.face,
      "data-stage-outline": mark.outline ? mark.stageId : void 0,
      role: inspection && !verticalStage ? "img" : void 0,
      tabIndex: inspection && !verticalStage ? 0 : void 0,
      "aria-label": inspection && !verticalStage ? `${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion` : void 0,
      pointerEvents: verticalStage || mark.face || mark.outline ? "none" : void 0,
      onPointerDown: inspection && !verticalStage ? (event) => event.preventDefault() : void 0,
      onPointerEnter: inspection && !verticalStage ? (event) => {
        if (event.pointerType === "mouse") onPreview(inspection);
      } : void 0,
      onPointerLeave: inspection && !verticalStage ? onLeave : void 0,
      onFocus: inspection && !verticalStage ? () => onPreview(inspection) : void 0,
      onBlur: inspection && !verticalStage ? onLeave : void 0,
      children: inspection && !verticalStage && /* @__PURE__ */ jsx2("title", { children: `${inspection.label}, ${format(inspection.value)}, ${percent(inspection.value, inspection.denominator)} conversion` })
    }
  ) });
}
function FadeDefs({ model, idPrefix }) {
  return /* @__PURE__ */ jsxs2("defs", { children: [
    model.clips.map((clip) => /* @__PURE__ */ jsx2("clipPath", { id: `${idPrefix}-${clip.id}`, clipPathUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsx2("path", { d: clip.d }) }, clip.id)),
    Object.entries(model.fadeStops).map(([side, stops]) => /* @__PURE__ */ jsxs2("g", { children: [
      /* @__PURE__ */ jsx2("linearGradient", { id: `${idPrefix}-fade-gradient-${side}`, x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: stops?.map(([offset, opacity], index) => /* @__PURE__ */ jsx2("stop", { offset: `${offset * 100}%`, stopColor: "white", stopOpacity: opacity }, index)) }),
      /* @__PURE__ */ jsx2(
        "mask",
        {
          id: `${idPrefix}-fade-${side}`,
          maskUnits: "objectBoundingBox",
          maskContentUnits: "objectBoundingBox",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          style: { maskType: "alpha" },
          children: /* @__PURE__ */ jsx2("rect", { x: 0, y: 0, width: 1, height: 1, fill: `url(#${idPrefix}-fade-gradient-${side})` })
        }
      )
    ] }, side))
  ] });
}
var AtlasFunnel = forwardRef(function AtlasFunnel2({
  data,
  variant = "continuous",
  options = emptyOptions,
  seed = 1234,
  onInspect,
  idPrefix: suppliedPrefix,
  viewBox,
  verticalTransition = "crossfade",
  children,
  style,
  ...rootProps
}, ref) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new Error("Seed must be an integer between 0 and 4294967295.");
  const id = useId();
  const idPrefix = suppliedPrefix ?? `atlas-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const normalized = useMemo(() => normalizeOptions(
    variant === "vertical" && options.verticalView === void 0 ? { ...options, verticalView: "flat" } : options
  ), [options, variant]);
  const model = useMemo(() => buildChartModel(data, variant, normalized), [data, variant, normalized]);
  if (variant === "vertical" && normalized.verticalViews) {
    buildChartModel(data, "vertical", { ...normalized, ...normalized.verticalViews.isometric, verticalView: "isometric" });
  }
  const [hoverKey, setHoverKey] = useState2(null);
  const [focusKey, setFocusKey] = useState2(null);
  const [pinnedKey, setPinnedKey] = useState2(null);
  const [keyboardMotion, setKeyboardMotion] = useState2(false);
  const svgRef = useRef(null);
  const proximityRef = useRef({ key: null, progress: 0 });
  const recentKeyRef = useRef(null);
  const frameRef = useRef(null);
  const switchTimerRef = useRef(null);
  const heldFocusRef = useRef(null);
  const inspections = useMemo(() => new Map(model.marks.flatMap((mark) => mark.type === "path" && mark.inspection ? [[mark.inspection.key, mark.inspection]] : [])), [model]);
  const activeKey = variant === "vertical" ? [focusKey, hoverKey, pinnedKey].find((key) => key && inspections.has(key)) ?? null : hoverKey && inspections.has(hoverKey) ? hoverKey : null;
  const visibleKeys = useMemo(() => activeKey && model.variant === "branching" ? connectedLinks(model, activeKey) : null, [model, activeKey]);
  const preview = (info) => {
    setHoverKey(info.key);
    onInspect?.(info);
  };
  const leave = () => {
    setHoverKey(null);
    onInspect?.(null);
  };
  const verticalData = variant === "vertical" ? data : null;
  const selectedIndex = verticalData?.findIndex((stage) => stage.id === activeKey) ?? -1;
  const verticalStages = verticalData?.map((stage, index) => {
    const marks = model.marks.filter((mark) => mark.type === "path" && (mark.stageId ?? mark.inspection?.key) === stage.id);
    const annotationKeys = new Set(["number", "leader", "label", "value"].map((part) => `stage:${stage.id}:${part}`));
    return {
      stage,
      index,
      marks,
      front: marks.find((mark) => mark.type === "path" && mark.inspection),
      annotations: model.marks.filter((mark) => mark.type !== "path" && annotationKeys.has(mark.key))
    };
  }) ?? [];
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !verticalData) return;
    const nearby = proximityRef.current;
    const key = [focusKey, nearby.key, pinnedKey].find((item) => item && inspections.has(item)) ?? null;
    const progress = focusKey || !nearby.key && pinnedKey ? 1 : nearby.progress;
    paintVerticalFocus(svg, verticalData, key, progress, heldFocusRef.current);
  }, [verticalData, model, focusKey, pinnedKey, hoverKey, inspections]);
  useEffect2(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = null;
    recentKeyRef.current = null;
    heldFocusRef.current = null;
    svgRef.current?.removeAttribute("data-switching");
  }, [model]);
  const stopFrame = () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };
  const trackProximity = (event) => {
    if (!verticalData || event.pointerType !== "mouse" || event.buttons || focusKey) return;
    const svg = svgRef.current;
    if (!svg) return;
    const next = proximityAt(svg, event.clientX, event.clientY, normalized.proximityRadius ?? 20);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && next.progress < 1) {
      next.key = null;
      next.progress = 0;
    }
    const previous = proximityRef.current.key;
    const recent = recentKeyRef.current;
    const now = window.performance.now();
    const outgoing = previous ?? (recent && now - recent.at < 400 ? recent.key : null);
    proximityRef.current = next;
    if (next.key) recentKeyRef.current = { key: next.key, at: now };
    setKeyboardMotion(false);
    svg.setAttribute("data-pointer-tracking", "true");
    if (next.key) svg.setAttribute("data-proximity-active", "true");
    else svg.removeAttribute("data-proximity-active");
    if (previous !== next.key) {
      if (outgoing && next.key && outgoing !== next.key && verticalTransition !== "none" && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
        const stage = [...svg.querySelectorAll(".atlas-vertical-stage")].find((group) => group.getAttribute("data-stage") === next.key);
        const focus = [...svg.querySelectorAll(".atlas-vertical-focus")].find((group) => group.getAttribute("data-stage-focus") === next.key);
        if (stage && focus && Number(window.getComputedStyle(focus).opacity) < 0.01) {
          const startingTransform = window.getComputedStyle(stage).transform;
          focus.style.transition = "none";
          focus.style.transform = startingTransform;
          focus.style.opacity = "0";
          window.getComputedStyle(focus).transform;
          focus.style.removeProperty("transition");
          heldFocusRef.current = next.key;
        } else heldFocusRef.current = null;
        svg.setAttribute("data-switching", "true");
        window.getComputedStyle(stage ?? svg).transitionProperty;
        switchTimerRef.current = window.setTimeout(() => {
          svg.removeAttribute("data-switching");
          switchTimerRef.current = null;
        }, crossfadeDurationMs(svg) + 16);
      }
      setHoverKey(next.key);
      onInspect?.(next.key ? inspections.get(next.key) ?? null : pinnedKey ? inspections.get(pinnedKey) ?? null : null);
    }
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const nearby = proximityRef.current;
      const key = nearby.key ?? (pinnedKey && inspections.has(pinnedKey) ? pinnedKey : null);
      heldFocusRef.current = null;
      paintVerticalFocus(svg, verticalData, key, nearby.key ? nearby.progress : key ? 1 : 0);
    });
  };
  const leaveProximity = (event) => {
    if (!verticalData || event.pointerType !== "mouse") return;
    const svg = svgRef.current;
    proximityRef.current = { key: null, progress: 0 };
    heldFocusRef.current = null;
    recentKeyRef.current = null;
    stopFrame();
    svg?.removeAttribute("data-pointer-tracking");
    svg?.removeAttribute("data-proximity-active");
    svg?.removeAttribute("data-switching");
    if (switchTimerRef.current !== null) window.clearTimeout(switchTimerRef.current);
    switchTimerRef.current = null;
    setHoverKey(null);
    const key = focusKey ?? pinnedKey;
    if (svg) paintVerticalFocus(svg, verticalData, key, key ? 1 : 0);
    onInspect?.(key ? inspections.get(key) ?? null : null);
  };
  const clearPinned = () => {
    setPinnedKey(null);
    if (!hoverKey && !focusKey) onInspect?.(null);
  };
  return /* @__PURE__ */ jsx2("div", { ...rootProps, ref, style: { display: "block", ...style }, children: /* @__PURE__ */ jsxs2(
    "svg",
    {
      ref: svgRef,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: viewBox ?? `0 0 ${model.width} ${model.height}`,
      width: "100%",
      role: "group",
      "aria-label": `${variant} conversion funnel`,
      "data-vertical-transition": verticalData ? verticalTransition : void 0,
      style: { display: "block", height: "auto", minWidth: model.width > 900 ? model.width : void 0 },
      onPointerEnter: verticalData ? trackProximity : void 0,
      onPointerMove: verticalData ? trackProximity : void 0,
      onPointerLeave: verticalData ? leaveProximity : void 0,
      onPointerUp: verticalData ? (event) => {
        if (event.pointerType !== "mouse" && !event.target.closest("[data-hit-stage]")) {
          stopFrame();
          proximityRef.current = { key: null, progress: 0 };
          svgRef.current?.removeAttribute("data-pointer-tracking");
          svgRef.current?.removeAttribute("data-proximity-active");
          setHoverKey(null);
          clearPinned();
        }
      } : void 0,
      children: [
        verticalData && /* @__PURE__ */ jsx2("style", { children: `
        .atlas-vertical-stage, .atlas-vertical-focus { transform-box: view-box; transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease; }
        .atlas-vertical-annotation { transition: opacity 150ms ease; }
        .atlas-vertical-hit { cursor: pointer; }
        [data-proximity-active="true"] { cursor: pointer; }
        .atlas-vertical-hit:focus { outline: none; }
        [data-pointer-tracking="true"] .atlas-vertical-stage, [data-pointer-tracking="true"] .atlas-vertical-focus { transition: opacity var(--atlas-crossfade-duration, 150ms) ease; }
        [data-vertical-transition="overlap"] .atlas-vertical-focus { transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease-out var(--atlas-overlap-delay, 50ms); }
        [data-vertical-transition="overlap"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, 0ms; }
        [data-vertical-transition="relay"] .atlas-vertical-focus { transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity var(--atlas-relay-duration, 75ms) ease-in; }
        [data-vertical-transition="relay"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, var(--atlas-relay-duration, 75ms); }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"] .atlas-vertical-focus { transition: opacity var(--atlas-crossfade-duration, 150ms) ease-out var(--atlas-overlap-delay, 50ms); }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"] .atlas-vertical-focus { transition: opacity var(--atlas-relay-duration, 75ms) ease-in; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"] .atlas-vertical-focus[data-visible] { transition-delay: var(--atlas-relay-duration, 75ms); }
        [data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-stage, [data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease; }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-crossfade-duration, 150ms) ease-out var(--atlas-overlap-delay, 50ms); }
        [data-vertical-transition="overlap"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, 0ms; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus { transition: transform var(--atlas-crossfade-duration, 150ms) cubic-bezier(.645,.045,.355,1), opacity var(--atlas-relay-duration, 75ms) ease-in; }
        [data-vertical-transition="relay"][data-pointer-tracking="true"][data-switching="true"] .atlas-vertical-focus[data-visible] { transition-delay: 0ms, var(--atlas-relay-duration, 75ms); }
        [data-vertical-transition="none"] .atlas-vertical-stage, [data-vertical-transition="none"] .atlas-vertical-focus { transition: transform 240ms cubic-bezier(.645,.045,.355,1), opacity 0ms; }
        [data-vertical-transition="none"][data-pointer-tracking="true"] .atlas-vertical-stage, [data-vertical-transition="none"][data-pointer-tracking="true"] .atlas-vertical-focus { transition: opacity 0ms; }
        @media (prefers-reduced-motion: reduce) {
          [data-vertical-transition] .atlas-vertical-stage, [data-vertical-transition] .atlas-vertical-focus,
          [data-vertical-transition] .atlas-vertical-focus[data-visible], [data-vertical-transition] .atlas-vertical-annotation,
          [data-vertical-transition][data-pointer-tracking="true"] .atlas-vertical-stage,
          [data-vertical-transition][data-pointer-tracking="true"] .atlas-vertical-focus { transition: none !important; }
        }
        [data-keyboard-motion="off"] .atlas-vertical-stage, [data-keyboard-motion="off"] .atlas-vertical-focus,
        [data-keyboard-motion="off"] .atlas-vertical-focus[data-visible], [data-keyboard-motion="off"] .atlas-vertical-annotation { transition: none !important; }
      ` }),
        /* @__PURE__ */ jsx2(
          StableScreenDefs,
          {
            idPrefix,
            width: model.width,
            height: model.height,
            density: normalized.density,
            patternAngle: normalized.patternAngle,
            dotGain: normalized.dotGain,
            roughness: normalized.roughness,
            seed,
            paperGrain: normalized.paperGrain,
            includeSparse: variant === "vertical" && normalized.verticalView === "isometric"
          }
        ),
        /* @__PURE__ */ jsx2(FadeDefs, { model, idPrefix }),
        /* @__PURE__ */ jsx2("rect", { width: model.width, height: model.height, fill: normalized.paperGrain ? `url(#${idPrefix}-grain)` : PAPER2 }),
        verticalData ? /* @__PURE__ */ jsxs2("g", { "data-keyboard-motion": keyboardMotion ? "off" : void 0, children: [
          verticalStages.map(({ stage, index, marks, front }) => {
            return /* @__PURE__ */ jsx2(
              "g",
              {
                className: "atlas-vertical-stage",
                "data-stage": stage.id,
                "data-stage-index": index,
                "data-active": index === selectedIndex || void 0,
                style: { transformOrigin: front?.type === "path" && front.focus ? `${front.focus.x}px ${front.focus.y}px` : void 0 },
                children: marks.map((mark) => /* @__PURE__ */ jsx2(
                  Mark,
                  {
                    mark,
                    idPrefix,
                    activeKey,
                    visibleKeys: null,
                    roughness: normalized.roughness ?? 0.15,
                    onPreview: preview,
                    onLeave: leave,
                    verticalStage: true
                  },
                  mark.key
                ))
              },
              stage.id
            );
          }),
          verticalStages.map(({ stage, index, marks, front }) => /* @__PURE__ */ jsxs2(
            "g",
            {
              className: "atlas-vertical-focus",
              "data-stage-focus": stage.id,
              "data-stage-index": index,
              "aria-hidden": "true",
              pointerEvents: "none",
              style: { opacity: 0, transformOrigin: front?.type === "path" && front.focus ? `${front.focus.x}px ${front.focus.y}px` : void 0 },
              children: [
                marks.map((mark) => /* @__PURE__ */ jsx2(
                  Mark,
                  {
                    mark,
                    idPrefix,
                    activeKey,
                    visibleKeys: null,
                    roughness: normalized.roughness ?? 0.15,
                    onPreview: preview,
                    onLeave: leave,
                    verticalStage: true
                  },
                  mark.key
                )),
                focusKey === stage.id && front?.type === "path" && /* @__PURE__ */ jsx2(
                  "path",
                  {
                    d: front.d,
                    fill: "none",
                    stroke: INK2,
                    strokeWidth: 2,
                    pointerEvents: "none",
                    "data-focus-outline": ""
                  }
                )
              ]
            },
            `focus:${stage.id}`
          )),
          verticalStages.map(({ stage, annotations }) => /* @__PURE__ */ jsx2(
            "g",
            {
              className: "atlas-vertical-annotation",
              "data-stage-annotation": stage.id,
              children: annotations.map((mark) => /* @__PURE__ */ jsx2(
                Mark,
                {
                  mark,
                  idPrefix,
                  activeKey,
                  visibleKeys: null,
                  roughness: normalized.roughness ?? 0.15,
                  onPreview: preview,
                  onLeave: leave
                },
                mark.key
              ))
            },
            `annotation:${stage.id}`
          )),
          verticalStages.map(({ stage, marks, front }) => {
            if (!front || front.type !== "path" || !front.inspection) return null;
            const info = front.inspection;
            return /* @__PURE__ */ jsxs2(
              "g",
              {
                className: "atlas-vertical-hit",
                "data-hit-stage": "",
                "data-key": info.key,
                tabIndex: 0,
                role: "button",
                "aria-pressed": pinnedKey === info.key,
                "aria-label": `${info.label}, ${format(info.value)}, ${percent(info.value, info.denominator)} conversion`,
                onPointerDown: (event) => event.preventDefault(),
                onPointerUp: (event) => {
                  if (event.pointerType !== "mouse") {
                    event.stopPropagation();
                    stopFrame();
                    proximityRef.current = { key: null, progress: 0 };
                    svgRef.current?.removeAttribute("data-pointer-tracking");
                    svgRef.current?.removeAttribute("data-proximity-active");
                    setHoverKey(null);
                    setKeyboardMotion(false);
                    const next = pinnedKey === info.key ? null : info.key;
                    setPinnedKey(next);
                    onInspect?.(next ? info : null);
                  }
                },
                onFocus: () => {
                  setKeyboardMotion(true);
                  setFocusKey(info.key);
                  onInspect?.(info);
                },
                onBlur: () => {
                  setKeyboardMotion(true);
                  setFocusKey(null);
                  onInspect?.(pinnedKey ? inspections.get(pinnedKey) ?? null : null);
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    const next = pinnedKey === info.key ? null : info.key;
                    setPinnedKey(next);
                    onInspect?.(next ? info : null);
                  } else if (event.key === "Escape") {
                    clearPinned();
                  }
                },
                children: [
                  /* @__PURE__ */ jsx2("title", { children: `${info.label}, ${format(info.value)}, ${percent(info.value, info.denominator)} conversion` }),
                  marks.flatMap((mark) => mark.type === "path" && mark.fill !== "none" ? [/* @__PURE__ */ jsx2("path", { d: mark.d, fill: "transparent", stroke: "none", pointerEvents: "all" }, mark.key)] : [])
                ]
              },
              `hit:${stage.id}`
            );
          })
        ] }) : model.marks.map((mark) => /* @__PURE__ */ jsx2(
          Mark,
          {
            mark,
            idPrefix,
            activeKey,
            visibleKeys,
            roughness: normalized.roughness ?? 0.15,
            onPreview: preview,
            onLeave: leave
          },
          mark.key
        )),
        children
      ]
    }
  ) });
});
export {
  AtlasFunnel
};
//# sourceMappingURL=atlas-funnel.js.map
