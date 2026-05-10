import os
import signal
import subprocess

def kill_port_5000():
    try:
        # Find process using port 5000
        cmd = "netstat -ano | findstr :5000"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        
        for line in lines:
            parts = line.split()
            if len(parts) >= 5:
                pid = parts[-1]
                print(f"Killing process {pid} on port 5000")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True)
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    kill_port_5000()
