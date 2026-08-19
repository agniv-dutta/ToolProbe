"""ToolProbe server launcher – kills stale port bindings before start."""

import os
import socket
import subprocess
import sys


def find_pid_on_port(port: int) -> int | None:
    """Return the PID of the process listening on *port*, or None."""
    try:
        out = subprocess.check_output(
            ["netstat", "-ano"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        for line in out.splitlines():
            parts = line.split()
            if len(parts) < 5:
                continue
            local = parts[1]
            state = parts[3]
            if state == "LISTENING" and local.endswith(f":{port}"):
                return int(parts[-1])
    except (subprocess.CalledProcessError, ValueError):
        pass
    return None


def kill_pid(pid: int) -> bool:
    """Force-kill *pid*.  Returns True on success."""
    try:
        subprocess.check_call(
            ["taskkill", "/PID", str(pid), "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    reload = "--reload" in sys.argv or os.environ.get("RELOAD", "").lower() in ("1", "true")

    pid = find_pid_on_port(port)
    if pid is not None:
        print(f"[run] Port {port} is held by PID {pid}. Killing …")
        if kill_pid(pid):
            print(f"[run] Killed PID {pid}.")
        else:
            print(f"[run] WARNING: could not kill PID {pid}. Exiting.", file=sys.stderr)
            sys.exit(1)

    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        host,
        "--port",
        str(port),
    ]
    if reload:
        cmd.append("--reload")

    print(f"[run] Starting uvicorn on {host}:{port}")
    raise SystemExit(subprocess.call(cmd))


if __name__ == "__main__":
    main()
