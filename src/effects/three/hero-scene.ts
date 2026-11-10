import * as THREE from "three";

export interface HeroSceneOptions {
  stars: number;
  planet: boolean;
  ring: boolean;
  maxFps?: number;
}

export interface HeroSceneHandle {
  dispose: () => void;
}

/**
 * 首页 hero 的轻量 3D：星场 + 低模星球 + 星环。
 * 只在显式挂载时加载；所有 GPU 资源在 dispose 中释放。
 */
export function mountHeroScene(canvas: HTMLCanvasElement, opts: HeroSceneOptions): HeroSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  // 星场
  const starCount = opts.stars;
  const positions = new Float32Array(starCount * 3);
  const alphas = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const r = 8 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    alphas[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xf2ce8a, size: 0.035, transparent: true, opacity: 0.85, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // 星球 + 星环
  const group = new THREE.Group();
  let planet: THREE.Mesh | null = null;
  let ring: THREE.Mesh | null = null;
  if (opts.planet) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6c4fa6, roughness: 0.6, metalness: 0.15, flatShading: true });
    planet = new THREE.Mesh(geo, mat);
    group.add(planet);
  }
  if (opts.ring) {
    const geo = new THREE.TorusGeometry(1.55, 0.045, 8, 96);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf3a8c4, transparent: true, opacity: 0.55 });
    ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2.6;
    group.add(ring);
  }
  group.position.set(0.4, 0.1, 0);
  scene.add(group);

  scene.add(new THREE.AmbientLight(0x9b7be0, 1.1));
  const light = new THREE.DirectionalLight(0xf7b7d0, 1.6);
  light.position.set(3, 2, 4);
  scene.add(light);

  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  const onMove = (e: PointerEvent) => {
    targetX = (e.clientX / innerWidth - 0.5) * 2;
    targetY = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener("pointermove", onMove, { passive: true });

  const onResize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", onResize, { passive: true });

  let raf = 0;
  let stopped = false;
  const maxFps = opts.maxFps ?? 40;
  const interval = 1000 / maxFps;
  let last = 0;

  const tick = (t: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    if (document.hidden || t - last < interval) return;
    last = t;
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;
    camera.position.x = mouseX * 0.35;
    camera.position.y = -mouseY * 0.25;
    camera.lookAt(0, 0, 0);
    stars.rotation.y += 0.0004;
    group.rotation.y += 0.0022;
    if (planet) planet.rotation.y += 0.0012;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  const onVisibility = () => {
    if (!document.hidden && !stopped) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      starGeo.dispose();
      starMat.dispose();
      if (planet) {
        planet.geometry.dispose();
        (planet.material as THREE.Material).dispose();
      }
      if (ring) {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
