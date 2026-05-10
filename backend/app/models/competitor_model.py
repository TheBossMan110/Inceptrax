from datetime import datetime
from app.models.user_model import BaseDocument, get_next_id


class CompetitorWatch(BaseDocument):
    collection_name = 'competitor_watch'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.idea_id = None
        self.keywords = []
        self.is_active = True
        self.scan_frequency = 'daily'
        self.last_scan_at = None
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_idea(cls, idea_id):
        doc = cls.get_collection().find_one({"idea_id": idea_id})
        return cls(doc) if doc else None

    @classmethod
    def find_all_active(cls):
        docs = cls.get_collection().find({"is_active": True})
        return [cls(doc) for doc in docs]

    def get_alerts(self):
        return CompetitorAlert.find_by_watch(self.id)

    def to_dict(self):
        alerts = self.get_alerts()
        return {
            'id': self.id,
            'idea_id': self.idea_id,
            'keywords': self.keywords,
            'is_active': self.is_active,
            'scan_frequency': self.scan_frequency,
            'last_scan_at': self.last_scan_at.isoformat() if isinstance(self.last_scan_at, datetime) else None,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
            'unread_alerts_count': sum(1 for alert in alerts if not alert.is_read)
        }


class CompetitorAlert(BaseDocument):
    collection_name = 'competitor_alerts'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.watch_id = None
        self.alert_type = 'other'
        self.title = ''
        self.snippet = None
        self.url = ''
        self.source = ''
        self.relevance_score = 0.5
        self.is_read = False
        self.discovered_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_watch(cls, watch_id, unread_only=False, limit=50):
        query = {"watch_id": watch_id}
        if unread_only:
            query["is_read"] = False
        docs = cls.get_collection().find(query).sort("discovered_at", -1).limit(limit)
        return [cls(doc) for doc in docs]

    @classmethod
    def find_by_url(cls, watch_id, url):
        doc = cls.get_collection().find_one({"watch_id": watch_id, "url": url})
        return cls(doc) if doc else None

    @classmethod
    def delete_by_watch(cls, watch_id):
        cls.get_collection().delete_many({"watch_id": watch_id})

    def to_dict(self):
        return {
            'id': self.id,
            'watch_id': self.watch_id,
            'alert_type': self.alert_type,
            'title': self.title,
            'snippet': self.snippet,
            'url': self.url,
            'source': self.source,
            'relevance_score': self.relevance_score,
            'is_read': self.is_read,
            'discovered_at': self.discovered_at.isoformat() if isinstance(self.discovered_at, datetime) else str(self.discovered_at)
        }
