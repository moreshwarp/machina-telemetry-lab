#!/usr/bin/env python3
"""
Machina Telemetry Lab - Terminal ASCII Dashboard
Interactive terminal visualizer with colorized telemetry bars.
Runs standalone without opening a web browser.
"""

import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from collector import SystemTelemetryCollector

def make_bar(pct, length=24, color_code="32"):
    filled = int(length * (pct / 100.0))
    bar = "█" * filled + "░" * (length - filled)
    return f"\033[{color_code}m{bar}\033[0m {pct:5.1f}%"

def main():
    collector = SystemTelemetryCollector()
    specs = collector.get_static_specs()

    print("\033[2J\033[H", end="") # Clear screen
    print("\033[1;36m" + "=" * 68 + "\033[0m")
    print(f"\033[1;37m🔬  MACHINA TELEMETRY LAB - TERMINAL RESEARCH STATION\033[0m")
    print("\033[1;36m" + "=" * 68 + "\033[0m")
    print(f"💻 Machine : \033[1;32m{specs['chip']}\033[0m ({specs['total_cores']} Cores: {specs['performance_cores']}P + {specs['efficiency_cores']}E)")
    print(f"🧠 Memory  : \033[1;33m{specs['memory_gb']} GB\033[0m Unified Architecture (UMA) • Page Size: {specs['page_size_bytes']//1024} KB")
    print(f"🏛️ Caches  : L1i: {specs['l1i_cache_kb']} KB | L1d: {specs['l1d_cache_kb']} KB | L2: {specs['l2_cache_mb']} MB")
    print(f"⚙️ Kernel  : {specs['kernel']}")
    print("\033[1;36m" + "-" * 68 + "\033[0m")
    print("Press [Ctrl + C] to exit terminal monitor.\n")

    try:
        while True:
            t = collector.get_full_telemetry()
            cpu = t["cpu"]
            mem = t["memory"]
            disk = t["storage"]
            net = t["network"]

            # Save cursor or ANSI reposition
            output = []
            output.append("\033[8;1H") # Move to line 8
            output.append(f"\033[1;34m[ PROCESSOR DYNAMICS ]\033[0m")
            output.append(f"  CPU Total Active : {make_bar(cpu['total_active_pct'], 25, '36')}")
            output.append(f"  User / Sys Load  : User: {cpu['user_pct']}% | Sys: {cpu['sys_pct']}% | Idle: {cpu['idle_pct']}%")
            output.append(f"  Load Averages    : 1m: {cpu['load_1m']:.2f} | 5m: {cpu['load_5m']:.2f} | 15m: {cpu['load_15m']:.2f} (Saturation: {cpu['saturation_pct']}%)")
            
            # Core summary line
            core_strs = [f"C{c['core_id']}({c['type'][0]}):{c['usage_pct']:.0f}%" for c in cpu['cores'][:5]]
            output.append(f"  P-Cores Active   : " + " | ".join(core_strs))
            core_strs2 = [f"C{c['core_id']}({c['type'][0]}):{c['usage_pct']:.0f}%" for c in cpu['cores'][5:]]
            output.append(f"  E-Cores Active   : " + " | ".join(core_strs2))

            output.append("")
            output.append(f"\033[1;35m[ UNIFIED MEMORY SUBSYSTEM ]\033[0m")
            output.append(f"  RAM Allocated    : {make_bar(mem['used_pct'], 25, '35')} ({mem['used_gb']} / {mem['total_gb']} GB)")
            b = mem["breakdown"]
            output.append(f"  Memory Breakdown : Wired: {b['wired_gb']}GB | Active: {b['active_gb']}GB | Inact: {b['inactive_gb']}GB | Comp: {b['compressed_gb']}GB")
            output.append(f"  Pressure Level   : \033[1;32m{mem['pressure_level']}\033[0m (Swapouts: {mem['swapouts']})")

            output.append("")
            output.append(f"\033[1;33m[ STORAGE & NETWORK FABRIC ]\033[0m")
            output.append(f"  APFS SSD Root    : {make_bar(disk['used_pct'], 25, '33')} ({disk['used_gb']} / {disk['total_gb']} GB)")
            output.append(f"  Disk Throughput  : {cpu['disk_io']['mb_per_sec']} MB/s ({cpu['disk_io']['transfers_per_sec']:.0f} tps)")
            output.append(f"  Network ({net['primary_interface']})  : ↓ {net['rx_rate_kbps']:6.1f} KB/s  |  ↑ {net['tx_rate_kbps']:6.1f} KB/s  (Total Rx: {net['cumulative_rx_mb']:.0f} MB)")
            output.append(f"  System Uptime    : {t['uptime'].strip()}")
            output.append("\033[1;36m" + "-" * 68 + "\033[0m")

            print("\n".join(output))
            time.sleep(1.5)
    except KeyboardInterrupt:
        print("\n\n\033[1;32m👋 Telemetry monitoring stopped. Goodbye!\033[0m\n")

if __name__ == "__main__":
    main()
