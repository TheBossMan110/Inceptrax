from app import get_db


class SystemStats:
    collection_name = 'system_stats'

    @classmethod
    def get_stats(cls):
        db = get_db()
        stats = db[cls.collection_name].find_one({"_id": "global"})
        if not stats:
            stats = {"_id": "global", "total_visitors": 0}
            db[cls.collection_name].insert_one(stats)
        return stats

    @classmethod
    def increment_visitors(cls):
        db = get_db()
        db[cls.collection_name].update_one(
            {"_id": "global"},
            {"$inc": {"total_visitors": 1}},
            upsert=True
        )

    @classmethod
    def get_total_visitors(cls):
        stats = cls.get_stats()
        return stats.get("total_visitors", 0)
