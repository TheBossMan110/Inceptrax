"""
MongoDB document models for Inceptrax.

Each class wraps pymongo operations and provides attribute-style access
so that existing route/service code requires minimal changes.

Auto-incrementing integer IDs are used via a `counters` collection
to maintain API compatibility with the frontend.
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app import get_db


# ─── Auto-increment ID helper ─────────────────────────────────────────────────

def get_next_id(collection_name):
    """Get the next auto-incrementing integer ID for a collection."""
    db = get_db()
    result = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return result["seq"]


# ─── Base Document ─────────────────────────────────────────────────────────────

class BaseDocument:
    """Base class providing attribute-style access to MongoDB documents."""
    collection_name = None

    def __init__(self, doc=None, **kwargs):
        if doc:
            for key, value in doc.items():
                if key == '_id':
                    self._id = value
                else:
                    setattr(self, key, value)
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    def get_collection(cls):
        return get_db()[cls.collection_name]

    @classmethod
    def find_by_id(cls, doc_id):
        """Find a document by its integer id field."""
        doc = cls.get_collection().find_one({"id": doc_id})
        return cls(doc) if doc else None

    def save(self):
        """Insert or update this document in MongoDB."""
        db = get_db()
        coll = db[self.collection_name]
        doc = self._to_doc()

        if hasattr(self, '_id') and self._id:
            coll.update_one({"_id": self._id}, {"$set": doc})
        else:
            if not hasattr(self, 'id') or self.id is None:
                self.id = get_next_id(self.collection_name)
                doc['id'] = self.id
            result = coll.insert_one(doc)
            self._id = result.inserted_id

    def delete(self):
        """Delete this document from MongoDB."""
        if hasattr(self, '_id') and self._id:
            get_db()[self.collection_name].delete_one({"_id": self._id})
        elif hasattr(self, 'id') and self.id:
            get_db()[self.collection_name].delete_one({"id": self.id})

    def _to_doc(self):
        """Convert instance attributes to a MongoDB document dict."""
        doc = {}
        for key, value in self.__dict__.items():
            if key.startswith('_'):
                continue
            doc[key] = value
        return doc


# ─── User ──────────────────────────────────────────────────────────────────────

class User(BaseDocument):
    collection_name = 'users'

    def __init__(self, doc=None, **kwargs):
        # Set defaults before loading doc
        self.id = None
        self.first_name = ''
        self.last_name = ''
        self.email = ''
        self.password_hash = ''
        self.created_at = datetime.utcnow()
        self.is_admin = False
        self.api_credits_used = 0
        self.is_discoverable = False
        self.bio = None
        self.skills = None
        self.looking_for = None
        self.linkedin_url = None
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_email(cls, email):
        doc = cls.get_collection().find_one({"email": email})
        return cls(doc) if doc else None

    @classmethod
    def find_all(cls, sort_by="created_at", descending=True):
        direction = -1 if descending else 1
        docs = cls.get_collection().find().sort(sort_by, direction)
        return [cls(doc) for doc in docs]

    @classmethod
    def count(cls, query=None):
        return cls.get_collection().count_documents(query or {})

    def set_password(self, password):
        """Hash password. Tries bcrypt first, falls back to werkzeug."""
        try:
            import bcrypt
            salt = bcrypt.gensalt(rounds=12)
            self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        except ImportError:
            self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password. Supports both bcrypt and werkzeug hashes."""
        if self.password_hash.startswith('$2b$') or self.password_hash.startswith('$2a$'):
            try:
                import bcrypt
                return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
            except ImportError:
                return False
        else:
            if check_password_hash(self.password_hash, password):
                self.set_password(password)
                self.save()
                return True
            return False

    def increment_api_credits(self, count=1):
        self.api_credits_used += count
        self.save()

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "is_admin": self.is_admin,
            "api_credits_used": self.api_credits_used,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
            "is_discoverable": self.is_discoverable,
            "bio": self.bio,
            "skills": self.skills,
            "looking_for": self.looking_for,
            "linkedin_url": self.linkedin_url
        }

    def to_public_profile_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "bio": self.bio,
            "skills": self.skills,
            "looking_for": self.looking_for,
            "linkedin_url": self.linkedin_url,
            "joined": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }


# ─── Idea ──────────────────────────────────────────────────────────────────────

class Idea(BaseDocument):
    collection_name = 'ideas'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.title = ''
        self.description = ''
        self.created_at = datetime.utcnow()
        self.updated_at = None
        self.user_id = None
        self.problem = None
        self.solution = None
        self.audience = None
        self.market = None
        self.industry = None
        self.target_market = None
        self.target_audience = None
        self.stage = 'idea'
        self.status = 'pending'
        self.analysis_status = {
            "validation": "pending",
            "market": "pending",
            "competitors": "pending",
            "mvp": "pending",
            "monetization": "pending",
            "gtm": "pending"
        }
        self.analysis_data = None
        self.overall_score = None
        self.risk_level = None
        self.is_public = False
        self.share_token = None
        self.public_views = 0
        self.ai_layers_count = 0
        self.founder_match_score = None
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_user(cls, user_id):
        docs = cls.get_collection().find({"user_id": user_id})
        return [cls(doc) for doc in docs]

    @classmethod
    def find_by_share_token(cls, share_token):
        doc = cls.get_collection().find_one({"share_token": share_token})
        return cls(doc) if doc else None

    @classmethod
    def find_public(cls, page=1, per_page=12, industry=None, sort='newest'):
        query = {"is_public": True}
        if industry:
            query["industry"] = {"$regex": industry, "$options": "i"}

        sort_field = "created_at"
        sort_dir = -1
        if sort == 'score':
            sort_field = "overall_score"
        elif sort == 'most_viewed':
            sort_field = "public_views"

        total = cls.get_collection().count_documents(query)
        skip = (page - 1) * per_page
        docs = cls.get_collection().find(query).sort(sort_field, sort_dir).skip(skip).limit(per_page)
        items = [cls(doc) for doc in docs]

        pages = (total + per_page - 1) // per_page if per_page > 0 else 1
        return items, total, pages

    @classmethod
    def count_by_user(cls, user_id, status=None):
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        return cls.get_collection().count_documents(query)

    @classmethod
    def delete_by_user(cls, user_id):
        cls.get_collection().delete_many({"user_id": user_id})

    @property
    def validation_score(self):
        if self.analysis_data and isinstance(self.analysis_data, dict) and 'overall_score' in self.analysis_data:
            return self.analysis_data.get('overall_score', 0)
        return 0

    def get_idea_context(self):
        return {
            "title": self.title or "",
            "description": self.description or "",
            "industry": self.industry or self.market or "",
            "target_market": self.target_market or "",
            "target_audience": self.target_audience or self.audience or "",
            "problem": self.problem or "",
            "solution": self.solution or "",
            "stage": self.stage or "idea"
        }

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
            "updated_at": self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else None,
            "user_id": self.user_id,
            "problem": self.problem,
            "solution": self.solution,
            "audience": self.audience,
            "market": self.market,
            "industry": self.industry,
            "target_market": self.target_market,
            "target_audience": self.target_audience,
            "stage": self.stage,
            "status": self.status,
            "analysis_status": self.analysis_status,
            "analysis_data": self.analysis_data,
            "overall_score": self.overall_score,
            "risk_level": self.risk_level,
            "is_public": self.is_public,
            "share_token": self.share_token,
            "public_views": self.public_views,
            "ai_layers_count": self.ai_layers_count,
            "founder_match_score": self.founder_match_score
        }

    def to_public_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
            "problem": self.problem,
            "solution": self.solution,
            "audience": self.audience,
            "market": self.market,
            "industry": self.industry,
            "status": self.status,
            "analysis_data": self.analysis_data,
            "validation_score": self.validation_score,
            "overall_score": self.overall_score,
            "risk_level": self.risk_level,
            "is_public": self.is_public,
            "share_token": self.share_token,
            "public_views": self.public_views,
            "ai_layers_count": self.ai_layers_count,
            "founder_match_score": self.founder_match_score
        }


# ─── StageResult ───────────────────────────────────────────────────────────────

class StageResult(BaseDocument):
    collection_name = 'stage_results'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.idea_id = None
        self.stage_number = None
        self.stage_name = ''
        self.result_json = None
        self.score = None
        self.version = 1
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_idea_and_stage(cls, idea_id, stage_name):
        doc = cls.get_collection().find_one({"idea_id": idea_id, "stage_name": stage_name})
        return cls(doc) if doc else None

    @classmethod
    def find_by_idea(cls, idea_id):
        docs = cls.get_collection().find({"idea_id": idea_id})
        return [cls(doc) for doc in docs]

    def to_dict(self):
        return {
            "id": self.id,
            "idea_id": self.idea_id,
            "stage_number": self.stage_number,
            "stage_name": self.stage_name,
            "result_json": self.result_json,
            "score": self.score,
            "version": self.version,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }


# ─── AILayersSession ───────────────────────────────────────────────────────────

class AILayersSession(BaseDocument):
    collection_name = 'ai_layers_sessions'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.idea_id = None
        self.conversation = None
        self.status = 'active'
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "idea_id": self.idea_id,
            "conversation": self.conversation,
            "status": self.status,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }


# ─── ChecklistItem ─────────────────────────────────────────────────────────────

class ChecklistItem(BaseDocument):
    collection_name = 'checklist_items'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.idea_id = None
        self.category = None
        self.text = ''
        self.is_completed = False
        self.completed_at = None
        self.sort_order = 0
        super().__init__(doc, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "idea_id": self.idea_id,
            "category": self.category,
            "text": self.text,
            "is_completed": self.is_completed,
            "completed_at": self.completed_at.isoformat() if isinstance(self.completed_at, datetime) else None,
            "sort_order": self.sort_order
        }


# ─── ResearchNote ──────────────────────────────────────────────────────────────

class ResearchNote(BaseDocument):
    collection_name = 'research_notes'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.idea_id = None
        self.user_id = None
        self.query = None
        self.result = None
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    def to_dict(self):
        return {
            "id": self.id,
            "idea_id": self.idea_id,
            "user_id": self.user_id,
            "query": self.query,
            "result": self.result,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }


# ─── TokenBlacklist ────────────────────────────────────────────────────────────

class TokenBlacklist(BaseDocument):
    collection_name = 'token_blacklist'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.token = ''
        self.blacklisted_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_token(cls, token):
        doc = cls.get_collection().find_one({"token": token})
        return cls(doc) if doc else None


# ─── Comment ───────────────────────────────────────────────────────────────────

class Comment(BaseDocument):
    collection_name = 'comments'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.content = ''
        self.author_name = 'Anonymous'
        self.created_at = datetime.utcnow()
        self.idea_id = None
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_idea(cls, idea_id, sort_asc=True):
        direction = 1 if sort_asc else -1
        docs = cls.get_collection().find({"idea_id": idea_id}).sort("created_at", direction)
        return [cls(doc) for doc in docs]

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "author_name": self.author_name,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
            "idea_id": self.idea_id
        }


# ─── Message ───────────────────────────────────────────────────────────────────

class Message(BaseDocument):
    collection_name = 'messages'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.sender_id = None
        self.receiver_id = None
        self.content = ''
        self.is_read = False
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_between_users(cls, user_a, user_b, sort_asc=True, page=None, per_page=None):
        query = {"$or": [
            {"sender_id": user_a, "receiver_id": user_b},
            {"sender_id": user_b, "receiver_id": user_a}
        ]}
        direction = 1 if sort_asc else -1
        cursor = cls.get_collection().find(query).sort("created_at", direction)

        if page and per_page:
            total = cls.get_collection().count_documents(query)
            skip = (page - 1) * per_page
            cursor = cursor.skip(skip).limit(per_page)
            items = [cls(doc) for doc in cursor]
            pages = (total + per_page - 1) // per_page if per_page > 0 else 1
            return items, total, pages
        return [cls(doc) for doc in cursor]

    @classmethod
    def find_user_conversations(cls, user_id):
        """Find all unique partner IDs a user has chatted with."""
        coll = cls.get_collection()
        sent = coll.distinct("receiver_id", {"sender_id": user_id})
        received = coll.distinct("sender_id", {"receiver_id": user_id})
        return list(set(sent + received))

    @classmethod
    def count_unread(cls, receiver_id, sender_id=None):
        query = {"receiver_id": receiver_id, "is_read": False}
        if sender_id:
            query["sender_id"] = sender_id
        return cls.get_collection().count_documents(query)

    @classmethod
    def mark_as_read(cls, sender_id, receiver_id):
        cls.get_collection().update_many(
            {"sender_id": sender_id, "receiver_id": receiver_id, "is_read": False},
            {"$set": {"is_read": True}}
        )

    @classmethod
    def get_last_message(cls, user_a, user_b):
        doc = cls.get_collection().find_one(
            {"$or": [
                {"sender_id": user_a, "receiver_id": user_b},
                {"sender_id": user_b, "receiver_id": user_a}
            ]},
            sort=[("created_at", -1)]
        )
        return cls(doc) if doc else None

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "content": self.content,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at)
        }


# ─── BlockedUser ───────────────────────────────────────────────────────────────

class BlockedUser(BaseDocument):
    collection_name = 'blocked_users'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.blocker_id = None
        self.blocked_id = None
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_block(cls, blocker_id, blocked_id):
        doc = cls.get_collection().find_one({"blocker_id": blocker_id, "blocked_id": blocked_id})
        return cls(doc) if doc else None

    @classmethod
    def get_blocked_ids(cls, user_id):
        """Get all user IDs blocked by user_id."""
        docs = cls.get_collection().find({"blocker_id": user_id})
        return [doc["blocked_id"] for doc in docs]

    @classmethod
    def get_blocked_by_ids(cls, user_id):
        """Get all user IDs that have blocked user_id."""
        docs = cls.get_collection().find({"blocked_id": user_id})
        return [doc["blocker_id"] for doc in docs]

    @classmethod
    def is_blocked_either_way(cls, user_a, user_b):
        doc = cls.get_collection().find_one({"$or": [
            {"blocker_id": user_a, "blocked_id": user_b},
            {"blocker_id": user_b, "blocked_id": user_a},
        ]})
        return doc is not None


# ─── UserReport ────────────────────────────────────────────────────────────────

class UserReport(BaseDocument):
    collection_name = 'user_reports'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.reporter_id = None
        self.reported_id = None
        self.reason = ''
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)


# ─── Notification ──────────────────────────────────────────────────────────────

class Notification(BaseDocument):
    collection_name = 'notifications'

    def __init__(self, doc=None, **kwargs):
        self.id = None
        self.user_id = None
        self.title = ''
        self.message = ''
        self.type = 'info'
        self.is_read = False
        self.link = None
        self.created_at = datetime.utcnow()
        super().__init__(doc, **kwargs)

    @classmethod
    def find_by_user(cls, user_id, unread_only=False, page=1, per_page=20):
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        total = cls.get_collection().count_documents(query)
        skip = (page - 1) * per_page
        docs = cls.get_collection().find(query).sort("created_at", -1).skip(skip).limit(per_page)
        items = [cls(doc) for doc in docs]
        pages = (total + per_page - 1) // per_page if per_page > 0 else 1
        return items, total, pages

    @classmethod
    def count_unread(cls, user_id):
        return cls.get_collection().count_documents({"user_id": user_id, "is_read": False})

    @classmethod
    def mark_all_read(cls, user_id):
        cls.get_collection().update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "is_read": self.is_read,
            "link": self.link,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else str(self.created_at),
        }
