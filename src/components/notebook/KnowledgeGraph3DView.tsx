import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  ArrowUpRight,
  BrainCircuit,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Workspace, Page } from '@/types/notebook';
import { AiConnectionSuggestion } from '@/types/ai';
import { extractWikiLinks } from '@/lib/notebook/links';

interface KnowledgeGraph3DViewProps {
  workspace: Workspace;
  allPages: Page[];
  aiSuggestions: AiConnectionSuggestion[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onOpenMindMap?: (page: Page) => void;
  isDarkMode: boolean;
  searchQuery: string;
  selectedNotebookId: string;
  showAiEdges: boolean;
}

interface Node3DData {
  id: string;
  title: string;
  notebookId: string;
  notebookName: string;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  degree: number;
  mesh?: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  sprite?: THREE.Sprite;
  connectedNodeIds: Set<string>;
}

interface Edge3DData {
  id: string;
  source: string;
  target: string;
  isAi: boolean;
  confidence?: number;
  cylinderMesh?: THREE.Mesh;
}

/**
 * Creates high-resolution text sprite that faces the camera
 */
function createTextSprite(text: string, isDarkMode: boolean, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();

  canvas.width = 512;
  canvas.height = 128;

  context.clearRect(0, 0, canvas.width, canvas.height);

  const fontSize = 32;
  context.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

  const textWidth = context.measureText(text).width;
  const rectWidth = Math.min(canvas.width - 20, textWidth + 48);
  const rectHeight = 60;
  const rectX = (canvas.width - rectWidth) / 2;
  const rectY = (canvas.height - rectHeight) / 2;

  // Background rounded pill
  context.beginPath();
  context.roundRect(rectX, rectY, rectWidth, rectHeight, 16);
  context.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.95)';
  context.fill();

  context.lineWidth = 3.5;
  context.strokeStyle = color || '#8b5cf6';
  context.stroke();

  // Text
  context.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(48, 12, 1);
  return sprite;
}

export const KnowledgeGraph3DView: React.FC<KnowledgeGraph3DViewProps> = ({
  workspace,
  allPages,
  aiSuggestions,
  activePageId,
  onSelectPage,
  onOpenMindMap,
  isDarkMode,
  searchQuery,
  selectedNotebookId,
  showAiEdges,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<Node3DData | null>(null);
  const [sceneReady, setSceneReady] = useState(0);

  // Mutable state refs to prevent scene destruction on toggle
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const edgesGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Orbit & Pan State
  const isDraggingRef = useRef(false);
  const isRightClickRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 650, theta: Math.PI / 4, phi: Math.PI / 3 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Node & Edge Data
  const nodesDataRef = useRef<Node3DData[]>([]);
  const edgesDataRef = useRef<Edge3DData[]>([]);

  // Notebook Color Lookup
  const notebookColorMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    workspace.notebooks.forEach((nb) => {
      map.set(nb.id, { name: nb.name, color: nb.color || '#8b5cf6' });
    });
    return map;
  }, [workspace.notebooks]);

  // Build Graph Data
  const { graphNodes, graphEdges } = useMemo(() => {
    const filteredPages = allPages.filter((p) => {
      if (selectedNotebookId !== 'all' && p.notebookId !== selectedNotebookId) return false;
      if (searchQuery.trim() && !p.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      return true;
    });

    const pageTitleMap = new Map<string, Page>();
    allPages.forEach((p) => pageTitleMap.set(p.title.toLowerCase().trim(), p));

    const nodeMap = new Map<string, Node3DData>();
    const nodes: Node3DData[] = [];
    const edges: Edge3DData[] = [];

    // Group notebooks to distribute initial clusters in 3D
    const notebookIds = Array.from(new Set(filteredPages.map((p) => p.notebookId)));
    const clusterCenters = new Map<string, { x: number; y: number; z: number }>();
    notebookIds.forEach((nbId, idx) => {
      const angle = (idx / Math.max(1, notebookIds.length)) * Math.PI * 2;
      clusterCenters.set(nbId, {
        x: Math.cos(angle) * 220,
        y: Math.sin(angle * 2) * 80,
        z: Math.sin(angle) * 220,
      });
    });

    // Distribute nodes around cluster centers
    filteredPages.forEach((page, i) => {
      const nb = notebookColorMap.get(page.notebookId);
      const center = clusterCenters.get(page.notebookId) || { x: 0, y: 0, z: 0 };
      const angle = i * 2.399;
      const r = 80 + Math.sqrt(i) * 60;

      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle * 1.5) * (r * 0.5);
      const z = center.z + Math.sin(angle) * r;

      const nodeData: Node3DData = {
        id: page.id,
        title: page.title,
        notebookId: page.notebookId,
        notebookName: nb?.name || 'Notebook',
        color: nb?.color || '#8b5cf6',
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: page.id === activePageId ? 16 : 11,
        degree: 0,
        connectedNodeIds: new Set<string>(),
      };

      nodeMap.set(page.id, nodeData);
      nodes.push(nodeData);
    });

    // Manual WikiLink Edges
    filteredPages.forEach((page) => {
      const links = extractWikiLinks(page.content);
      links.forEach((link) => {
        const targetPage = pageTitleMap.get(link.targetTitle.toLowerCase().trim());
        if (targetPage && nodeMap.has(targetPage.id) && targetPage.id !== page.id) {
          edges.push({
            id: `edge3d-${page.id}-${targetPage.id}`,
            source: page.id,
            target: targetPage.id,
            isAi: false,
          });
          const src = nodeMap.get(page.id);
          const tgt = nodeMap.get(targetPage.id);
          if (src && tgt) {
            src.degree++;
            tgt.degree++;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    });

    // AI Connection Edges
    if (showAiEdges) {
      aiSuggestions.forEach((sug) => {
        if (nodeMap.has(sug.sourcePageId) && nodeMap.has(sug.targetPageId)) {
          edges.push({
            id: `edge3d-ai-${sug.sourcePageId}-${sug.targetPageId}`,
            source: sug.sourcePageId,
            target: sug.targetPageId,
            isAi: true,
            confidence: sug.confidence,
          });
          const src = nodeMap.get(sug.sourcePageId);
          const tgt = nodeMap.get(sug.targetPageId);
          if (src && tgt) {
            src.degree += 0.5;
            tgt.degree += 0.5;
            src.connectedNodeIds.add(tgt.id);
            tgt.connectedNodeIds.add(src.id);
          }
        }
      });
    }

    // Dynamic radius scaled by degree
    nodes.forEach((n) => {
      n.radius = Math.min(24, Math.max(10, (n.id === activePageId ? 16 : 10) + n.degree * 2));
    });

    nodesDataRef.current = nodes;
    edgesDataRef.current = edges;

    return { graphNodes: nodes, graphEdges: edges };
  }, [allPages, selectedNotebookId, searchQuery, notebookColorMap, activePageId, showAiEdges, aiSuggestions]);

  // Update Camera from spherical coordinates
  const updateCameraFromSpherical = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current;
    const x = radius * Math.sin(phi) * Math.cos(theta) + cameraTargetRef.current.x;
    const y = radius * Math.cos(phi) + cameraTargetRef.current.y;
    const z = radius * Math.sin(phi) * Math.sin(theta) + cameraTargetRef.current.z;
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  }, []);

  // Initialize Three.js Scene ONCE
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 650;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(isDarkMode ? 0x070913 : 0xf8fafc);
    if (isDarkMode) {
      scene.fog = new THREE.FogExp2(0x070913, 0.0006);
    }

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 1, 4000);
    cameraRef.current = camera;
    updateCameraFromSpherical();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.9 : 1.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2.5, 1200);
    pointLight.position.set(200, 300, 200);
    scene.add(pointLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(-200, -200, -200);
    scene.add(dirLight);

    // 5. Starfield Universe
    if (isDarkMode) {
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1000;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 2600;
        starPositions[i + 1] = (Math.random() - 0.5) * 2600;
        starPositions[i + 2] = (Math.random() - 0.5) * 2600;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0xc4b5fd,
        size: 2.0,
        transparent: true,
        opacity: 0.5,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);
    }

    // 6. Node & Edge Groups
    const edgesGroup = new THREE.Group();
    edgesGroupRef.current = edgesGroup;
    scene.add(edgesGroup);

    const nodesGroup = new THREE.Group();
    nodesGroupRef.current = nodesGroup;
    scene.add(nodesGroup);

    // Signal that scene is ready to populate
    setSceneReady((c) => c + 1);

    // Animation & 3D Physics Loop
    let animationFrameId: number;
    let physicsTick = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // 3D Physics Simulation (Wide-Area Spacing)
      if (physicsTick < 350) {
        physicsTick++;
        const nodes = nodesDataRef.current;
        const edges = edgesDataRef.current;
        const nMap = new Map<string, Node3DData>();
        nodes.forEach((n) => nMap.set(n.id, n));

        // 1. 3D Coulomb Repulsion
        const repulsionStrength = 75000;
        const minDist = 60;

        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const dist = Math.max(minDist, Math.hypot(dx, dy, dz));
            const force = Math.min(40, repulsionStrength / (dist * dist));

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            a.vx -= fx;
            a.vy -= fy;
            a.vz -= fz;
            b.vx += fx;
            b.vy += fy;
            b.vz += fz;
          }
        }

        // 2. 3D Spring Attraction along Links
        for (const edge of edges) {
          const src = nMap.get(edge.source);
          const tgt = nMap.get(edge.target);
          if (src && tgt) {
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dz = tgt.z - src.z;
            const dist = Math.hypot(dx, dy, dz) || 1;
            const ideal = edge.isAi ? 260 : 190;
            const displacement = dist - ideal;
            const springK = 0.025;

            const fx = (dx / dist) * displacement * springK;
            const fy = (dy / dist) * displacement * springK;
            const fz = (dz / dist) * displacement * springK;

            src.vx += fx;
            src.vy += fy;
            src.vz += fz;
            tgt.vx -= fx;
            tgt.vy -= fy;
            tgt.vz -= fz;
          }
        }

        // 3. Center Gravity & Damping
        const damping = 0.88;
        const centerGravity = 0.0004;

        for (const node of nodes) {
          node.vx = (node.vx - node.x * centerGravity) * damping;
          node.vy = (node.vy - node.y * centerGravity) * damping;
          node.vz = (node.vz - node.z * centerGravity) * damping;

          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;

          if (node.mesh) {
            node.mesh.position.set(node.x, node.y, node.z);
          }
          if (node.sprite) {
            node.sprite.position.set(node.x, node.y + node.radius + 14, node.z);
          }
        }

        // Update 3D Beam Mesh positions & orientations
        for (const edge of edges) {
          if (edge.cylinderMesh) {
            const src = nMap.get(edge.source);
            const tgt = nMap.get(edge.target);
            if (src && tgt) {
              const p1 = new THREE.Vector3(src.x, src.y, src.z);
              const p2 = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
              const distance = p1.distanceTo(p2);
              const mid = p1.clone().add(p2).multiplyScalar(0.5);

              edge.cylinderMesh.position.copy(mid);
              edge.cylinderMesh.scale.set(1, distance, 1);
              edge.cylinderMesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                p2.clone().sub(p1).normalize()
              );
            }
          }
        }
      }

      // Continuous Auto-Orbit using mutable ref
      if (autoRotateRef.current && !isDraggingRef.current) {
        cameraSphericalRef.current.theta += 0.0016;
        updateCameraFromSpherical();
      }

      // Always render frame
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isDarkMode, updateCameraFromSpherical]);

  // Re-populate 3D Meshes when graph data changes or scene initializes
  useEffect(() => {
    const scene = sceneRef.current;
    const nodesGroup = nodesGroupRef.current;
    const edgesGroup = edgesGroupRef.current;
    if (!scene || !nodesGroup || !edgesGroup) return;

    // Clear old meshes
    while (nodesGroup.children.length > 0) {
      const obj = nodesGroup.children[0];
      nodesGroup.remove(obj);
    }
    while (edgesGroup.children.length > 0) {
      const obj = edgesGroup.children[0];
      edgesGroup.remove(obj);
    }

    const nMap = new Map<string, Node3DData>();
    graphNodes.forEach((n) => nMap.set(n.id, n));

    const sphereGeo = new THREE.SphereGeometry(1, 28, 28);
    const cylinderGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 8);

    // 1. Build 3D Solid Glowing Beams (Thick & Visible)
    graphEdges.forEach((edge) => {
      const src = nMap.get(edge.source);
      const tgt = nMap.get(edge.target);
      if (!src || !tgt) return;

      const colorHex = edge.isAi ? 0xc084fc : isDarkMode ? 0x64748b : 0x94a3b8;
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: edge.isAi ? 0x9333ea : isDarkMode ? 0x334155 : 0x64748b,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: edge.isAi ? 0.9 : 0.65,
      });

      const cylinder = new THREE.Mesh(cylinderGeo, material);
      const p1 = new THREE.Vector3(src.x, src.y, src.z);
      const p2 = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
      const distance = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      cylinder.position.copy(mid);
      cylinder.scale.set(edge.isAi ? 1.6 : 1.2, distance, edge.isAi ? 1.6 : 1.2);
      cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());

      edge.cylinderMesh = cylinder;
      edgesGroup.add(cylinder);
    });

    // 2. Build 3D Node Spheres & Text Labels
    graphNodes.forEach((node) => {
      const isActive = node.id === activePageId;
      const baseColor = new THREE.Color(node.color || '#8b5cf6');

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: isActive ? baseColor.clone().multiplyScalar(0.8) : baseColor.clone().multiplyScalar(0.3),
        roughness: 0.25,
        metalness: 0.35,
      });

      const mesh = new THREE.Mesh(sphereGeo, material);
      mesh.scale.set(node.radius, node.radius, node.radius);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData = { nodeId: node.id, nodeData: node };

      node.mesh = mesh;
      nodesGroup.add(mesh);

      // Clean non-distorting 2D Ring around active node facing camera
      if (isActive) {
        const ringGeo = new THREE.RingGeometry(node.radius * 1.2, node.radius * 1.35, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: baseColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(node.x, node.y, node.z);
        ringMesh.lookAt(cameraRef.current ? cameraRef.current.position : new THREE.Vector3(0, 0, 1));
        nodesGroup.add(ringMesh);
      }

      // 3D Text Billboard Sprite
      const sprite = createTextSprite(node.title, isDarkMode, node.color);
      sprite.position.set(node.x, node.y + node.radius + 14, node.z);
      sprite.visible = showLabels;
      node.sprite = sprite;
      nodesGroup.add(sprite);
    });
  }, [graphNodes, graphEdges, activePageId, isDarkMode, sceneReady]);

  // Toggle label visibility without rebuilding the scene
  useEffect(() => {
    graphNodes.forEach((node) => {
      if (node.sprite) {
        node.sprite.visible = showLabels;
      }
    });
  }, [showLabels, graphNodes]);

  // Highlight connections on hover
  useEffect(() => {
    const nodes = nodesDataRef.current;
    const edges = edgesDataRef.current;
    const hoveredId = hoveredNodeId;

    if (!hoveredId) {
      nodes.forEach((n) => {
        if (n.mesh) {
          (n.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0;
          (n.mesh.material as THREE.MeshStandardMaterial).transparent = false;
        }
        if (n.sprite) n.sprite.material.opacity = 1.0;
      });
      edges.forEach((e) => {
        if (e.cylinderMesh) {
          (e.cylinderMesh.material as THREE.MeshStandardMaterial).opacity = e.isAi ? 0.9 : 0.65;
          (e.cylinderMesh.material as THREE.MeshStandardMaterial).emissive.setHex(
            e.isAi ? 0x9333ea : isDarkMode ? 0x334155 : 0x64748b
          );
        }
      });
      return;
    }

    const hoveredNode = nodes.find((n) => n.id === hoveredId);
    const connectedSet = hoveredNode ? hoveredNode.connectedNodeIds : new Set<string>();

    nodes.forEach((n) => {
      const isMatch = n.id === hoveredId || connectedSet.has(n.id);
      if (n.mesh) {
        (n.mesh.material as THREE.MeshStandardMaterial).transparent = !isMatch;
        (n.mesh.material as THREE.MeshStandardMaterial).opacity = isMatch ? 1.0 : 0.2;
      }
      if (n.sprite) n.sprite.material.opacity = isMatch ? 1.0 : 0.15;
    });

    edges.forEach((e) => {
      const isConnected = e.source === hoveredId || e.target === hoveredId;
      if (e.cylinderMesh) {
        (e.cylinderMesh.material as THREE.MeshStandardMaterial).opacity = isConnected ? 1.0 : 0.1;
        if (isConnected) {
          (e.cylinderMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x38bdf8);
        }
      }
    });
  }, [hoveredNodeId, isDarkMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    isRightClickRef.current = e.button === 2 || e.shiftKey;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const mount = mountRef.current;
    if (!mount || !cameraRef.current || !nodesGroupRef.current) return;

    const rect = mount.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Orbit or Pan
    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      if (isRightClickRef.current) {
        const panSpeed = 0.65;
        cameraTargetRef.current.x -= deltaX * panSpeed;
        cameraTargetRef.current.y += deltaY * panSpeed;
      } else {
        cameraSphericalRef.current.theta -= deltaX * 0.006;
        cameraSphericalRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi - deltaY * 0.006)
        );
      }

      updateCameraFromSpherical();
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Raycast for Hover
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(nodesGroupRef.current.children, false);

    if (intersects.length > 0) {
      const hit = intersects.find((hitObj) => hitObj.object.userData?.nodeId);
      if (hit) {
        const nodeId = hit.object.userData.nodeId;
        setHoveredNodeId(nodeId);
        mount.style.cursor = 'pointer';
        return;
      }
    }

    setHoveredNodeId(null);
    mount.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    cameraSphericalRef.current.radius = Math.max(100, Math.min(2000, cameraSphericalRef.current.radius * zoomFactor));
    updateCameraFromSpherical();
  };

  const handleClick = (e: React.MouseEvent) => {
    const mount = mountRef.current;
    if (!mount || !cameraRef.current || !nodesGroupRef.current) return;

    const rect = mount.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(nodesGroupRef.current.children, false);

    if (intersects.length > 0) {
      const hit = intersects.find((hitObj) => hitObj.object.userData?.nodeId);
      if (hit) {
        const data: Node3DData = hit.object.userData.nodeData;
        setSelectedNodeData(data);
        return;
      }
    }
    setSelectedNodeData(null);
  };

  const handleResetCamera = () => {
    cameraSphericalRef.current = { radius: 650, theta: Math.PI / 4, phi: Math.PI / 3 };
    cameraTargetRef.current.set(0, 0, 0);
    updateCameraFromSpherical();
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden select-none bg-slate-950">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating 3D Control Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs shadow-2xl">
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            autoRotate
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle 3D Cinematic Auto-Orbit"
        >
          {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{autoRotate ? 'Orbiting' : 'Orbit'}</span>
        </button>

        <button
          onClick={() => setShowLabels((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all ${
            showLabels
              ? 'bg-slate-800 text-purple-300'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Toggle 3D Note Title Labels"
        >
          {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>Labels</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Reset 3D Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Navigation Guide Tip */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 pointer-events-none shadow-xl">
        <div className="flex items-center gap-3 font-medium">
          <span>🖱️ <strong>Left Drag</strong>: Rotate 360°</span>
          <span>•</span>
          <span>🖱️ <strong>Right Drag</strong>: Pan</span>
          <span>•</span>
          <span>🔍 <strong>Scroll</strong>: Zoom</span>
        </div>
        <div className="text-[10px] text-purple-400 font-mono">
          {graphNodes.length} 3D Nodes • {graphEdges.length} 3D Beams • Hover node to highlight connections
        </div>
      </div>

      {/* Selected Node Details Modal / Floating Card */}
      {selectedNodeData && (
        <div className="absolute top-4 right-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-purple-800/80 shadow-2xl text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${selectedNodeData.color}25`,
                color: selectedNodeData.color,
                border: `1px solid ${selectedNodeData.color}60`,
              }}
            >
              {selectedNodeData.notebookName}
            </span>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white leading-snug">{selectedNodeData.title}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Connected to <strong>{selectedNodeData.connectedNodeIds.size}</strong> notes in your knowledge graph.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                onSelectPage(selectedNodeData.id);
                setSelectedNodeData(null);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Open Note</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            {onOpenMindMap && (
              <button
                onClick={() => {
                  const page = allPages.find((p) => p.id === selectedNodeData.id);
                  if (page) onOpenMindMap(page);
                  setSelectedNodeData(null);
                }}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Generate Mind Map for this Note"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                <span>Mind Map</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
