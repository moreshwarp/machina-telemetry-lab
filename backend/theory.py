"""
Machina Telemetry Lab - Researcher Knowledge Base & Architecture Theory
Provides simple, research-backed explanations of computer systems concepts.
"""

RESEARCHER_THEORY = {
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
}
