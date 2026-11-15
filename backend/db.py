import sqlite3
import os
import time
import json
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(__file__), "telemetry.db")

class TelemetryDB:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Enable WAL mode for high performance concurrent writes
            cursor.execute("PRAGMA journal_mode = WAL;")
            cursor.execute("PRAGMA synchronous = NORMAL;")
            
            # Timeseries telemetry table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                device_type TEXT NOT NULL,
                cpu_total REAL NOT NULL,
                core_count INTEGER NOT NULL,
                mem_used_bytes INTEGER NOT NULL,
                mem_total_bytes INTEGER NOT NULL,
                mem_compressed_bytes INTEGER DEFAULT 0,
                queue_load_1m REAL NOT NULL,
                queue_saturation_ratio REAL NOT NULL,
                raw_json TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_samples(timestamp);")

            # Benchmarking results table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS benchmark_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                device_type TEXT NOT NULL,
                l1_latency_ns REAL,
                l2_latency_ns REAL,
                dram_latency_ns REAL,
                wall_factor REAL,
                raw_json TEXT
            );
            """)

            # System event log
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL
            );
            """)
            conn.commit()

    def insert_sample(self, data: Dict[str, Any], device_type: str = "host_darwin_m4"):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            ts = data.get("timestamp", time.time())
            cpu_total = data.get("cpu", {}).get("total", 0.0)
            core_count = data.get("cpu", {}).get("core_count", 10)
            mem = data.get("memory", {})
            mem_used = mem.get("used_bytes", 0)
            mem_total = mem.get("total_bytes", 0)
            mem_compressed = mem.get("compressed_bytes", 0)
            load = data.get("saturation", {})
            load_1m = load.get("load_1m", 0.0)
            saturation = load.get("ratio", 0.0)
            
            cursor.execute("""
            INSERT INTO telemetry_samples (
                timestamp, device_type, cpu_total, core_count,
                mem_used_bytes, mem_total_bytes, mem_compressed_bytes,
                queue_load_1m, queue_saturation_ratio, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                ts, device_type, cpu_total, core_count,
                mem_used, mem_total, mem_compressed,
                load_1m, saturation, json.dumps(data)
            ))
            conn.commit()

    def get_recent_samples(self, limit: int = 60) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, timestamp, device_type, cpu_total, core_count,
                   mem_used_bytes, mem_total_bytes, mem_compressed_bytes,
                   queue_load_1m, queue_saturation_ratio
            FROM telemetry_samples
            ORDER BY timestamp DESC
            LIMIT ?;
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows][::-1]

    def get_db_stats(self) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM telemetry_samples;")
            total_samples = cursor.fetchone()["count"]
            cursor.execute("SELECT COUNT(*) as count FROM benchmark_runs;")
            total_benchmarks = cursor.fetchone()["count"]
            size_bytes = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            return {
                "engine": "SQLite3 (WAL mode)",
                "total_telemetry_samples": total_samples,
                "total_benchmarks": total_benchmarks,
                "database_size_bytes": size_bytes,
                "database_size_kb": round(size_bytes / 1024, 2)
            }

db = TelemetryDB()
