/**
 * Machina Telemetry Lab - Client Application
 * Handles real-time telemetry streaming, custom canvas chart rendering,
 * and interactive researcher insights.
 */

(() => {
  // --- State ---
  let isPolling = true;
  let pollIntervalMs = 1000;
  let timerId = null;
  let theoryVisible = true;
  let isDemoMode = false;
  let backendBaseUrl = '';

  const MAX_HISTORY = 30;
  const cpuHistory = []; // { user, sys, idle }
  const netHistory = []; // { rx, tx }

  let staticSpecs = null;
  let theoryData = null;

  // Fallback theory for static GitHub Pages hosting
  const STATIC_THEORY = {
    "von_neumann": {
      "title": "Von Neumann Architecture & The Memory Wall 🏛️",
      "simple_explanation": "Computers are built with separate brains (CPU) and storage (RAM). Because data must travel across physical wires between them, the speed of memory often slows down the super-fast CPU. This is called the 'Memory Wall'.",
      "deep_research": "First proposed by John von Neumann in 1945, this design consists of a Central Processing Unit (ALU and Control Unit), Registers, Memory, and I/O. Modern Apple Silicon mitigates the memory wall using a Unified Memory Architecture (UMA) that merges CPU, GPU, and Neural Engine memory onto a single high-bandwidth bus (up to 120+ GB/s).",
      "key_takeaway": "Memory access is hundreds of times slower than arithmetic calculation."
    },
    "cpu_topology": {
      "title": "Asymmetric Multiprocessing: Performance vs Efficiency Cores ⚡🌱",
      "simple_explanation": "Your Apple M4 chip has 10 physical cores split into two teams: 4 'Muscle' Performance Cores for heavy lifting (coding, gaming, video), and 6 'Low-Energy' Efficiency Cores for quiet background tasks (syncing, typing, audio).",
      "deep_research": "This is known as heterogeneous computing (ARM big.LITTLE / DynamIQ). Performance cores feature deep 8-wide instruction decoders and large vector units. Efficiency cores use a narrower pipeline, consuming roughly 10% to 15% of the power while still providing snappy responsiveness.",
      "key_takeaway": "Energy efficiency allows laptops and desktops to stay silent and cool without thermal throttling."
    },
    "cache_hierarchy": {
      "title": "The Memory Latency Hierarchy ⏳",
      "simple_explanation": "Memory is a pyramid: the smaller and closer to the CPU it is, the faster it responds. If the CPU can find data in L1 cache, it takes 1 nanosecond. If it has to fetch from disk, it takes 25,000 nanoseconds!",
      "deep_research": "Access latencies relative to light travel time:\n• L1 Cache (128KB/64KB): ~1 ns (30 cm of light travel)\n• L2 Cache (4MB shared): ~3.5 ns (1 meter)\n• Unified RAM (16GB): ~60-80 ns (20 meters)\n• NVMe SSD Storage: ~25,000 ns (7.5 km!)\nModern compilers and CPUs rely on spatial and temporal locality to achieve >95% cache hit rates.",
      "key_takeaway": "CPUs spend most of their time waiting for memory unless algorithms are cache-friendly."
    },
    "memory_management": {
      "title": "Mach Virtual Memory: Why 'Free RAM' is a Myth 🧠",
      "simple_explanation": "Seeing only 100MB of 'Free' RAM on your Mac is normal and good! Modern operating systems treat free RAM as wasted RAM. They use spare space to cache apps and files so everything opens instantly.",
      "deep_research": "macOS utilizes the Mach virtual memory subsystem with 16KB pages. Memory is categorized into:\n• Wired: Kernel data structures locked into physical RAM (cannot swap).\n• Active: Recently touched memory by running apps.\n• Inactive: Memory from past operations left in RAM as a cache.\n• Compressed: In-RAM zlib compression engine that packs idle memory 2:1 to 4:1 instead of wearing out SSD flash with swap writes.\n• Free: Unallocated pages ready for immediate zeroing.",
      "key_takeaway": "Check 'Memory Pressure', not 'Free RAM', to judge if your computer needs more memory."
    },
    "load_average": {
      "title": "Load Average & Queueing Theory 🚦",
      "simple_explanation": "Load average is like cars at a toll booth. On a 10-lane highway (your 10-core CPU), a load of 3.0 means 3 lanes are used and 7 lanes are wide open! Traffic only starts backing up when load exceeds 10.0.",
      "deep_research": "Calculated via an exponentially damped moving average over 1, 5, and 15 minute windows. Unlike pure CPU percentage, load average accounts for processes actively executing on a core PLUS processes waiting in the uninterruptible run-queue (such as blocked on disk I/O). Saturation = (Load / Total Cores) * 100%.",
      "key_takeaway": "A load average below your core count (10.0) means zero compute bottleneck."
    },
    "storage_io": {
      "title": "Storage I/O & APFS Architecture 💾",
      "simple_explanation": "Storage is where files live permanently. Modern Apple SSDs use the Apple File System (APFS), which does instant file cloning and encryption without copying physical bits.",
      "deep_research": "APFS operates on a copy-on-write design, meaning duplicate files point to the same physical NAND flash blocks until modified. Disk I/O metrics track transactions per second (tps) and transfer throughput (MB/s). Transfer sizes (KB/t) illustrate sequential vs random access profiles.",
      "key_takeaway": "Random 4KB reads test flash latency, while sequential 1MB transfers test bus bandwidth."
    }
  };

  // --- DOM Elements ---
  const chipModelEl = document.getElementById('chipModel');
  const osKernelEl = document.getElementById('osKernel');
  const uptimeDisplayEl = document.getElementById('uptimeDisplay');
  const footerHostnameEl = document.getElementById('footerHostname');

  // KPI elements
  const cpuTotalPctEl = document.getElementById('cpuTotalPct');
  const load1mEl = document.getElementById('load1m');
  const load5mEl = document.getElementById('load5m');
  const cpuSaturationBadge = document.getElementById('cpuSaturationBadge');
  const cpuMeterFill = document.getElementById('cpuMeterFill');

  const memUsedGbEl = document.getElementById('memUsedGb');
  const memTotalGbEl = document.getElementById('memTotalGb');
  const memAppGbEl = document.getElementById('memAppGb');
  const memWiredGbEl = document.getElementById('memWiredGb');
  const memPressureBadge = document.getElementById('memPressureBadge');
  const memMeterFill = document.getElementById('memMeterFill');

  const storageUsedGbEl = document.getElementById('storageUsedGb');
  const storageTotalGbEl = document.getElementById('storageTotalGb');
  const storageAvailGbEl = document.getElementById('storageAvailGb');
  const storagePctEl = document.getElementById('storagePct');
  const storageMeterFill = document.getElementById('storageMeterFill');

  const netRxRateEl = document.getElementById('netRxRate');
  const netTxRateEl = document.getElementById('netTxRate');
  const netTotalRxEl = document.getElementById('netTotalRx');
  const netIfaceBadge = document.getElementById('netIfaceBadge');
  const netInterfaceTag = document.getElementById('netInterfaceTag');

  // Cores Grid
  const coresGridEl = document.getElementById('coresGrid');

  // Memory detailed breakdown
  const memWiredValEl = document.getElementById('memWiredVal');
  const memActiveValEl = document.getElementById('memActiveVal');
  const memInactiveValEl = document.getElementById('memInactiveVal');
  const memCompressedValEl = document.getElementById('memCompressedVal');
  const memFreeValEl = document.getElementById('memFreeVal');
  const donutUsedPctEl = document.getElementById('donutUsedPct');

  // Storage & IO
  const diskMbSecEl = document.getElementById('diskMbSec');
  const diskTpsEl = document.getElementById('diskTps');
  const diskKbTEl = document.getElementById('diskKbT');
  const packetsInEl = document.getElementById('packetsIn');
  const packetsOutEl = document.getElementById('packetsOut');
  const totalRxGbEl = document.getElementById('totalRxGb');
  const totalTxGbEl = document.getElementById('totalTxGb');

  // Controls
  const pollRateSelect = document.getElementById('pollRate');
  const pauseBtn = document.getElementById('pauseBtn');
  const snapshotBtn = document.getElementById('snapshotBtn');
  const toggleTheoryBtn = document.getElementById('toggleTheoryBtn');
  const theoryStateText = document.getElementById('theoryStateText');

  // Canvases
  const cpuCanvas = document.getElementById('cpuWaveformCanvas');
  const cpuCtx = cpuCanvas ? cpuCanvas.getContext('2d') : null;

  const netCanvas = document.getElementById('networkWaveformCanvas');
  const netCtx = netCanvas ? netCanvas.getContext('2d') : null;

  const memCanvas = document.getElementById('memoryDonutCanvas');
  const memCtx = memCanvas ? memCanvas.getContext('2d') : null;

  // --- High DPI Canvas Initialization ---
  function setupHiDPI(canvas, ctx) {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  function resizeAllCanvases() {
    setupHiDPI(cpuCanvas, cpuCtx);
    setupHiDPI(netCanvas, netCtx);
    setupHiDPI(memCanvas, memCtx);
  }

  window.addEventListener('resize', resizeAllCanvases);

  // --- Initialization ---
  async function init() {
    resizeAllCanvases();
    await loadStaticSpecs();
    await loadTheory();
    setupControls();
    scheduleNextFetch(true);
  }

  async function loadStaticSpecs() {
    try {
      const res = await fetch(`${backendBaseUrl}/api/specs`);
      if (!res.ok) throw new Error('API not available');
      staticSpecs = await res.json();
    } catch (err) {
      console.info('Running in static demo mode (GitHub Pages / offline).');
      isDemoMode = true;
      staticSpecs = {
        model: "Mac16,10",
        chip: "Apple M4",
        architecture: "arm64",
        total_cores: 10,
        logical_cores: 10,
        performance_cores: 4,
        efficiency_cores: 6,
        memory_bytes: 17179869184,
        memory_gb: 16.0,
        page_size_bytes: 16384,
        l1i_cache_kb: 128.0,
        l1d_cache_kb: 64.0,
        l2_cache_mb: 4.0,
        kernel: "Darwin Kernel Version 27.2.0 (ARM64)",
        hostname: "github-demo.local",
        os_name: "macOS",
        os_release: "27.2.1"
      };
      showDemoBanner();
    }

    chipModelEl.textContent = `${staticSpecs.chip} (${staticSpecs.total_cores} Cores: ${staticSpecs.performance_cores}P + ${staticSpecs.efficiency_cores}E)`;
    osKernelEl.textContent = `${staticSpecs.os_name} • ${staticSpecs.architecture.toUpperCase()}`;
    footerHostnameEl.textContent = staticSpecs.hostname;
    memTotalGbEl.textContent = staticSpecs.memory_gb;

    buildCoreCards(staticSpecs.total_cores, staticSpecs.performance_cores);
  }

  function showDemoBanner() {
    const banner = document.createElement('div');
    banner.id = 'demoBanner';
    banner.style.cssText = 'background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 8px 16px; border-radius: 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-family: var(--font-mono);';
    banner.innerHTML = `
      <span>🌐 <strong>GitHub Pages Interactive Demo Mode</strong>: Simulating real-time Apple M4 telemetry.</span>
      <span style="font-size: 11px; color: #94a3b8;">Clone repo to monitor your actual hardware!</span>
    `;
    const header = document.querySelector('.lab-header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    }
  }

  async function loadTheory() {
    try {
      const res = await fetch(`${backendBaseUrl}/api/theory`);
      if (!res.ok) throw new Error('API not available');
      theoryData = await res.json();
    } catch (err) {
      theoryData = STATIC_THEORY;
    }
    populateTheoryUI();
  }

  // Generate realistic simulated telemetry when hosted statically
  let simTime = Date.now();
  function getSimulatedTelemetry() {
    simTime += 1000;
    const wave = Math.sin(simTime / 5000);
    const userPct = Math.max(5, Math.min(85, 18 + wave * 12 + (Math.random() * 8 - 4)));
    const sysPct = Math.max(2, Math.min(25, 6 + wave * 3 + Math.random() * 2));
    const totalActive = userPct + sysPct;
    const load1m = 2.4 + wave * 0.8 + Math.random() * 0.3;

    const cores = [];
    for (let i = 0; i < 10; i++) {
      const isP = i < 4;
      const base = isP ? totalActive * 1.25 : totalActive * 0.85;
      cores.push({
        core_id: i,
        type: isP ? 'Performance' : 'Efficiency',
        usage_pct: Math.round(Math.max(1, Math.min(99, base + Math.random() * 6 - 3)))
      });
    }

    const rx = Math.max(10, 140 + Math.sin(simTime / 3000) * 110 + Math.random() * 40);
    const tx = Math.max(5, 45 + Math.sin(simTime / 4000) * 35 + Math.random() * 15);

    return {
      timestamp: simTime / 1000,
      iso_time: new Date(simTime).toISOString(),
      uptime: "up 3 days, 2:15, 1 user, load averages: 2.85 2.60 2.45",
      cpu: {
        user_pct: Math.round(userPct),
        sys_pct: Math.round(sysPct),
        idle_pct: Math.round(100 - totalActive),
        total_active_pct: Math.round(totalActive * 10) / 10,
        load_1m: Math.round(load1m * 100) / 100,
        load_5m: 2.65,
        load_15m: 2.40,
        saturation_pct: Math.round((load1m / 10) * 1000) / 10,
        cores: cores,
        disk_io: {
          kb_per_transfer: 32.4,
          transfers_per_sec: Math.round(50 + Math.random() * 40),
          mb_per_sec: Math.round((1.2 + Math.random() * 2.5) * 100) / 100
        }
      },
      memory: {
        total_bytes: 17179869184,
        total_gb: 16.0,
        used_bytes: 15.2 * 1024**3,
        used_gb: 15.2,
        available_bytes: 0.8 * 1024**3,
        available_gb: 0.8,
        used_pct: 95.0,
        pressure_level: "Normal",
        breakdown: {
          wired_gb: 2.5,
          active_gb: 4.3 + Math.sin(simTime / 10000) * 0.2,
          inactive_gb: 4.1 - Math.sin(simTime / 10000) * 0.2,
          compressed_gb: 4.3,
          free_gb: 0.1,
          speculative_gb: 0.02,
          purgeable_gb: 0.1
        },
        pageins: 9581000,
        pageouts: 100300,
        swapins: 0,
        swapouts: 0
      },
      storage: {
        filesystem: "/dev/disk3s7s1",
        mount_point: "/",
        total_gb: 228.3,
        used_gb: 12.8,
        available_gb: 122.5,
        used_pct: 10.0
      },
      network: {
        primary_interface: "en1 (Wi-Fi)",
        cumulative_rx_mb: 6180.0,
        cumulative_tx_mb: 1020.0,
        total_packets_in: 7050000,
        total_packets_out: 3010000,
        rx_rate_kbps: Math.round(rx * 10) / 10,
        tx_rate_kbps: Math.round(tx * 10) / 10
      }
    };
  }

  function populateTheoryUI() {
    if (!theoryData) return;

    // CPU Theory
    const cpuTheory = theoryData.cpu_topology;
    if (cpuTheory) {
      document.getElementById('theoryCpuTitle').textContent = cpuTheory.title;
      document.getElementById('theoryCpuSimple').textContent = cpuTheory.simple_explanation;
      document.getElementById('theoryCpuDeep').textContent = cpuTheory.deep_research;
    }

    // Memory Theory
    const memTheory = theoryData.memory_management;
    if (memTheory) {
      document.getElementById('theoryMemTitle').textContent = memTheory.title;
      document.getElementById('theoryMemSimple').textContent = memTheory.simple_explanation;
      document.getElementById('theoryMemDeep').textContent = memTheory.deep_research;
    }

    // IO Theory
    const ioTheory = theoryData.storage_io;
    if (ioTheory) {
      document.getElementById('theoryIoTitle').textContent = ioTheory.title;
      document.getElementById('theoryIoSimple').textContent = ioTheory.simple_explanation;
      document.getElementById('theoryIoDeep').textContent = ioTheory.deep_research;
    }
  }

  function buildCoreCards(totalCores, pCount) {
    coresGridEl.innerHTML = '';
    for (let i = 0; i < totalCores; i++) {
      const isP = i < pCount;
      const typeLabel = isP ? 'P' : 'E';
      const typeClass = isP ? 'p-tag' : 'e-tag';
      const fillClass = isP ? 'p-fill' : 'e-fill';

      const card = document.createElement('div');
      card.className = 'core-card';
      card.id = `core-card-${i}`;
      card.title = isP ? `Core #${i}: High-Frequency Performance Core` : `Core #${i}: Low-Power Efficiency Core`;

      card.innerHTML = `
        <div class="core-header-row">
          <span class="core-name">C${i}</span>
          <span class="core-chip-tag ${typeClass}">${typeLabel}</span>
        </div>
        <div class="core-val" id="core-val-${i}">--%</div>
        <div class="core-bar">
          <div class="core-bar-fill ${fillClass}" id="core-fill-${i}" style="width: 0%"></div>
        </div>
      `;
      coresGridEl.appendChild(card);
    }
  }

  // --- Telemetry Polling Loop ---
  async function fetchTelemetry() {
    try {
      let data;
      if (isDemoMode) {
        data = getSimulatedTelemetry();
      } else {
        const res = await fetch(`${backendBaseUrl}/api/telemetry`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      updateDashboard(data);
    } catch (err) {
      console.warn('Telemetry fetch error, switching to demo mode:', err);
      isDemoMode = true;
      showDemoBanner();
      const data = getSimulatedTelemetry();
      updateDashboard(data);
    } finally {
      if (isPolling) {
        scheduleNextFetch();
      }
    }
  }

  function scheduleNextFetch(immediate = false) {
    if (timerId) clearTimeout(timerId);
    if (immediate) {
      fetchTelemetry();
    } else {
      timerId = setTimeout(fetchTelemetry, pollIntervalMs);
    }
  }

  // --- UI Update Dispatcher ---
  function updateDashboard(data) {
    const { cpu, memory, storage, network, uptime } = data;

    // Header uptime
    if (uptime) {
      const uptimeMatch = uptime.match(/up\s+([^,]+(?:,\s*[^,]+)?)/);
      uptimeDisplayEl.textContent = uptimeMatch ? `Up: ${uptimeMatch[1]}` : uptime;
    }

    // 1. CPU Update
    const totalActive = cpu.total_active_pct;
    cpuTotalPctEl.textContent = totalActive.toFixed(1);
    load1mEl.textContent = cpu.load_1m.toFixed(2);
    load5mEl.textContent = cpu.load_5m.toFixed(2);
    cpuMeterFill.style.width = `${Math.min(100, totalActive)}%`;

    if (cpu.saturation_pct < 50) {
      cpuSaturationBadge.textContent = 'Optimal (0 Wait)';
      cpuSaturationBadge.className = 'kpi-badge badge-green';
    } else if (cpu.saturation_pct < 90) {
      cpuSaturationBadge.textContent = 'Moderate Activity';
      cpuSaturationBadge.className = 'kpi-badge badge-amber';
    } else {
      cpuSaturationBadge.textContent = 'Saturated Queue';
      cpuSaturationBadge.className = 'kpi-badge badge-purple';
    }

    // Per-core updates
    if (cpu.cores) {
      cpu.cores.forEach((core) => {
        const valEl = document.getElementById(`core-val-${core.core_id}`);
        const fillEl = document.getElementById(`core-fill-${core.core_id}`);
        if (valEl && fillEl) {
          valEl.textContent = `${core.usage_pct}%`;
          fillEl.style.width = `${core.usage_pct}%`;
        }
      });
    }

    // CPU waveform history
    cpuHistory.push({
      user: cpu.user_pct,
      sys: cpu.sys_pct,
      idle: cpu.idle_pct
    });
    if (cpuHistory.length > MAX_HISTORY) cpuHistory.shift();
    renderCpuWaveform();

    // 2. Memory Update
    memUsedGbEl.textContent = memory.used_gb.toFixed(1);
    const appMemGb = (memory.breakdown.active_gb + memory.breakdown.inactive_gb - memory.breakdown.purgeable_gb).toFixed(1);
    memAppGbEl.textContent = appMemGb;
    memWiredGbEl.textContent = memory.breakdown.wired_gb.toFixed(1);
    memMeterFill.style.width = `${memory.used_pct}%`;

    memPressureBadge.textContent = `${memory.pressure_level} Pressure`;
    memPressureBadge.className = memory.pressure_level === 'Normal' ? 'kpi-badge badge-green' : 'kpi-badge badge-amber';

    // Detailed breakdown
    memWiredValEl.textContent = `${memory.breakdown.wired_gb.toFixed(2)} GB`;
    memActiveValEl.textContent = `${memory.breakdown.active_gb.toFixed(2)} GB`;
    memInactiveValEl.textContent = `${memory.breakdown.inactive_gb.toFixed(2)} GB`;
    memCompressedValEl.textContent = `${memory.breakdown.compressed_gb.toFixed(2)} GB`;
    memFreeValEl.textContent = `${memory.breakdown.free_gb.toFixed(2)} GB`;
    donutUsedPctEl.textContent = `${memory.used_pct}%`;

    renderMemoryDonut(memory.breakdown);

    // 3. Storage & IO Update
    storageUsedGbEl.textContent = storage.used_gb.toFixed(1);
    storageTotalGbEl.textContent = storage.total_gb.toFixed(0);
    storageAvailGbEl.textContent = storage.available_gb.toFixed(1);
    storagePctEl.textContent = storage.used_pct;
    storageMeterFill.style.width = `${storage.used_pct}%`;

    diskMbSecEl.textContent = cpu.disk_io.mb_per_sec.toFixed(2);
    diskTpsEl.textContent = cpu.disk_io.transfers_per_sec.toFixed(0);
    diskKbTEl.textContent = cpu.disk_io.kb_per_transfer.toFixed(1);

    // 4. Network Update
    netRxRateEl.textContent = network.rx_rate_kbps.toFixed(1);
    netTxRateEl.textContent = network.tx_rate_kbps.toFixed(1);
    netTotalRxEl.textContent = network.cumulative_rx_mb.toFixed(0);
    netIfaceBadge.textContent = network.primary_interface;
    netInterfaceTag.textContent = `Active: ${network.primary_interface}`;

    packetsInEl.textContent = network.total_packets_in.toLocaleString();
    packetsOutEl.textContent = network.total_packets_out.toLocaleString();
    totalRxGbEl.textContent = `${(network.cumulative_rx_mb / 1024).toFixed(2)} GB`;
    totalTxGbEl.textContent = `${(network.cumulative_tx_mb / 1024).toFixed(2)} GB`;

    netHistory.push({
      rx: network.rx_rate_kbps,
      tx: network.tx_rate_kbps
    });
    if (netHistory.length > MAX_HISTORY) netHistory.shift();
    renderNetworkWaveform();
  }

  // --- Canvas Rendering: CPU Activity Waveform ---
  function renderCpuWaveform() {
    if (!cpuCanvas || !cpuCtx) return;
    const rect = cpuCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    cpuCtx.clearRect(0, 0, w, h);

    // Draw horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    cpuCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    cpuCtx.lineWidth = 1;
    for (let pct = 0; pct <= 100; pct += 25) {
      const y = h - (pct / 100) * (h - 20) - 10;
      cpuCtx.beginPath();
      cpuCtx.moveTo(0, y);
      cpuCtx.lineTo(w, y);
      cpuCtx.stroke();

      cpuCtx.fillStyle = '#64748b';
      cpuCtx.font = '10px JetBrains Mono';
      cpuCtx.fillText(`${pct}%`, 8, y - 3);
    }

    if (cpuHistory.length < 2) return;

    const step = w / (MAX_HISTORY - 1);

    // Helper to draw a stacked or single line curve
    function drawLine(getValue, strokeColor, fillColor) {
      cpuCtx.beginPath();
      const firstY = h - (getValue(cpuHistory[0]) / 100) * (h - 20) - 10;
      cpuCtx.moveTo(0, firstY);

      for (let i = 1; i < cpuHistory.length; i++) {
        const x = i * step;
        const y = h - (getValue(cpuHistory[i]) / 100) * (h - 20) - 10;
        const prevX = (i - 1) * step;
        const prevY = h - (getValue(cpuHistory[i - 1]) / 100) * (h - 20) - 10;
        const cpX = (prevX + x) / 2;
        cpuCtx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }

      if (fillColor) {
        cpuCtx.lineTo((cpuHistory.length - 1) * step, h);
        cpuCtx.lineTo(0, h);
        cpuCtx.closePath();
        cpuCtx.fillStyle = fillColor;
        cpuCtx.fill();
      }

      cpuCtx.strokeStyle = strokeColor;
      cpuCtx.lineWidth = 2;
      cpuCtx.stroke();
    }

    // Draw Total Active (User + System) Area
    const activeGrad = cpuCtx.createLinearGradient(0, 0, 0, h);
    activeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    activeGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    drawLine((pt) => Math.min(100, pt.user + pt.sys), '#38bdf8', activeGrad);

    // Draw System Load Line
    drawLine((pt) => pt.sys, '#c084fc', null);
  }

  // --- Canvas Rendering: Network Bandwidth Waveform ---
  function renderNetworkWaveform() {
    if (!netCanvas || !netCtx) return;
    const rect = netCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    netCtx.clearRect(0, 0, w, h);

    if (netHistory.length < 2) return;

    // Determine max bandwidth for dynamic auto-scaling
    let maxRate = 100; // minimum baseline 100 KB/s
    netHistory.forEach((pt) => {
      maxRate = Math.max(maxRate, pt.rx, pt.tx);
    });
    maxRate = Math.ceil(maxRate * 1.25); // 25% headroom

    // Draw grid
    netCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    netCtx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
      const y = h - ratio * (h - 16) - 8;
      netCtx.beginPath();
      netCtx.moveTo(0, y);
      netCtx.lineTo(w, y);
      netCtx.stroke();

      netCtx.fillStyle = '#64748b';
      netCtx.font = '9px JetBrains Mono';
      netCtx.fillText(`${Math.round(ratio * maxRate)} KB/s`, 8, y - 2);
    });

    const step = w / (MAX_HISTORY - 1);

    // Inbound (Download) Line
    netCtx.beginPath();
    for (let i = 0; i < netHistory.length; i++) {
      const x = i * step;
      const y = h - (netHistory[i].rx / maxRate) * (h - 16) - 8;
      if (i === 0) netCtx.moveTo(x, y);
      else {
        const prevX = (i - 1) * step;
        const prevY = h - (netHistory[i - 1].rx / maxRate) * (h - 16) - 8;
        const cpX = (prevX + x) / 2;
        netCtx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }
    netCtx.strokeStyle = '#38bdf8';
    netCtx.lineWidth = 2;
    netCtx.stroke();

    // Outbound (Upload) Line
    netCtx.beginPath();
    for (let i = 0; i < netHistory.length; i++) {
      const x = i * step;
      const y = h - (netHistory[i].tx / maxRate) * (h - 16) - 8;
      if (i === 0) netCtx.moveTo(x, y);
      else {
        const prevX = (i - 1) * step;
        const prevY = h - (netHistory[i - 1].tx / maxRate) * (h - 16) - 8;
        const cpX = (prevX + x) / 2;
        netCtx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }
    netCtx.strokeStyle = '#fbbf24';
    netCtx.lineWidth = 1.5;
    netCtx.stroke();
  }

  // --- Canvas Rendering: Memory Donut Chart ---
  function renderMemoryDonut(breakdown) {
    if (!memCanvas || !memCtx) return;
    const rect = memCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 10;
    const innerRadius = radius * 0.72;

    memCtx.clearRect(0, 0, w, h);

    const slices = [
      { label: 'Wired', value: breakdown.wired_gb, color: '#f43f5e' },
      { label: 'Active', value: breakdown.active_gb, color: '#38bdf8' },
      { label: 'Inactive', value: breakdown.inactive_gb, color: '#c084fc' },
      { label: 'Compressed', value: breakdown.compressed_gb, color: '#fbbf24' },
      { label: 'Free', value: Math.max(0.1, breakdown.free_gb), color: '#34d399' }
    ];

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    let startAngle = -Math.PI / 2;

    slices.forEach((slice) => {
      const sliceAngle = (slice.value / total) * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      memCtx.beginPath();
      memCtx.arc(cx, cy, radius, startAngle, endAngle);
      memCtx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
      memCtx.closePath();

      memCtx.fillStyle = slice.color;
      memCtx.fill();

      startAngle = endAngle;
    });

    // Outer subtle border
    memCtx.beginPath();
    memCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    memCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    memCtx.lineWidth = 1;
    memCtx.stroke();
  }

  // --- Controls & Event Listeners ---
  function setupControls() {
    // Sampling rate selector
    pollRateSelect.addEventListener('change', (e) => {
      pollIntervalMs = parseInt(e.target.value, 10) || 1000;
      scheduleNextFetch(true);
    });

    // Pause / Resume
    pauseBtn.addEventListener('click', () => {
      isPolling = !isPolling;
      if (isPolling) {
        pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> Pause';
        pauseBtn.classList.remove('btn-primary');
        scheduleNextFetch(true);
      } else {
        pauseBtn.innerHTML = '<span class="btn-icon">▶️</span> Resume';
        pauseBtn.classList.add('btn-primary');
        if (timerId) clearTimeout(timerId);
      }
    });

    // Snapshot JSON Download
    snapshotBtn.addEventListener('click', async () => {
      try {
        snapshotBtn.textContent = 'Generating...';
        let data;
        if (isDemoMode) {
          data = {
            experiment: "Machina System Telemetry Lab (GitHub Pages Demo)",
            generated_at: new Date().toISOString(),
            collector_version: "1.0-web-demo",
            telemetry: getSimulatedTelemetry(),
            theory: STATIC_THEORY
          };
        } else {
          const res = await fetch(`${backendBaseUrl}/api/snapshot`);
          data = await res.json();
        }
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `machina_telemetry_snapshot_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        snapshotBtn.innerHTML = '<span class="btn-icon">📥</span> Export Snapshot';
      } catch (err) {
        console.error('Snapshot failed:', err);
        snapshotBtn.innerHTML = '<span class="btn-icon">❌</span> Error';
      }
    });

    // Toggle Researcher Notes
    toggleTheoryBtn.addEventListener('click', () => {
      theoryVisible = !theoryVisible;
      theoryStateText.textContent = theoryVisible ? 'ON' : 'OFF';
      document.querySelectorAll('.theory-card').forEach((card) => {
        if (theoryVisible) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });

    // Interactive Architecture Nodes
    document.querySelectorAll('.arch-node').forEach((node) => {
      node.addEventListener('click', () => {
        const topic = node.getAttribute('data-topic');
        if (topic && theoryData && theoryData[topic]) {
          alert(`🔬 ${theoryData[topic].title}\n\n💡 Simple Explanation:\n${theoryData[topic].simple_explanation}\n\n📐 Key Takeaway:\n${theoryData[topic].key_takeaway}`);
        }
      });
    });
  }

  // Run upon DOM load
  window.addEventListener('DOMContentLoaded', init);
})();
