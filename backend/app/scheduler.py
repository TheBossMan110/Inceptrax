"""
Scheduled jobs for background tasks
"""
from app.services.competitor_monitoring_service import CompetitorMonitoringService
from app.models.competitor_model import CompetitorWatch

def scan_all_active_watches():
    """Scan all active competitor watches"""
    try:
        watches = CompetitorWatch.find_all_active()
        print(f"[Scheduler] Starting scan for {len(watches)} active watches...")
        
        for watch in watches:
            try:
                result = CompetitorMonitoringService.scan_competitors(watch.id)
                if 'error' in result:
                    print(f"[Scheduler] Scan failed for watch {watch.id}: {result['error']}")
                else:
                    print(f"[Scheduler] Watch {watch.id} scanned successfully. New alerts: {result.get('new_alerts', 0)}")
            except Exception as e:
                print(f"[Scheduler] Error scanning watch {watch.id}: {str(e)}")
                
        print(f"[Scheduler] Scan cycle completed.")
    except Exception as e:
        print(f"[Scheduler] Fatal error in scan_all_active_watches: {str(e)}")
