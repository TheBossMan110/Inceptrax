from app import create_app
app = create_app()
routes = [r.rule for r in app.url_map.iter_rules() if 'export' in r.rule]
print("Export routes:", routes)
print("Backend OK")
