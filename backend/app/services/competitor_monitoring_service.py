import os
import json
from datetime import datetime, timedelta
from serpapi import GoogleSearch
from app.models.competitor_model import CompetitorWatch, CompetitorAlert

class CompetitorMonitoringService:
    
    @staticmethod
    def extract_keywords(idea):
        """Generate search keywords from idea data"""
        keywords = set()
        
        if idea.title:
            keywords.add(idea.title.lower())
            
        if idea.analysis_data:
            competitors = idea.analysis_data.get('competitors', [])
            for comp in competitors:
                if isinstance(comp, dict) and 'name' in comp:
                    name = comp['name']
                    if name and len(name) < 40 and name.lower() not in ['unknown competitor', 'n/a', 'unknown']:
                        keywords.add(name.lower())

            market_data = idea.analysis_data.get('market_research', {})
            if 'industry' in market_data:
                industry = market_data['industry'].lower()
                if len(industry.split()) < 5:
                    keywords.add(industry)
                    
        if idea.market and len(idea.market.split()) < 5:
            keywords.add(idea.market.lower())
            
        return list(keywords)[:7]
    
    @staticmethod
    def classify_alert_type(title, snippet):
        text = (title + ' ' + snippet).lower()
        
        if any(word in text for word in ['funding', 'raised', 'investment', 'series', 'round', 'million', 'billion']):
            return 'funding'
        elif any(word in text for word in ['launch', 'launches', 'released', 'announces', 'unveils', 'introduces']):
            return 'launch'
        elif any(word in text for word in ['startup', 'founded', 'new company', 'co-founder']):
            return 'new_startup'
        else:
            return 'other'
    
    @staticmethod
    def calculate_relevance(result, keywords):
        text = (result.get('title', '') + ' ' + result.get('snippet', '')).lower()
        matches = sum(1 for keyword in keywords if keyword.lower() in text)
        score = min(matches / len(keywords), 1.0) if keywords else 0.5
        return round(score, 2)
    
    @staticmethod
    def scan_competitors(watch_id):
        watch = CompetitorWatch.find_by_id(watch_id)
        if not watch or not watch.is_active:
            return {'error': 'Watch not found or inactive'}
            
        # Auto-update keywords if insufficient
        if not watch.keywords or len(watch.keywords) <= 1:
            try:
                from app.models.user_model import Idea
                idea = Idea.find_by_id(watch.idea_id)
                if idea:
                    new_keywords = CompetitorMonitoringService.extract_keywords(idea)
                    if new_keywords and len(new_keywords) > len(watch.keywords or []):
                        watch.keywords = new_keywords
                        watch.save()
            except Exception as e:
                print(f"Auto-update keywords failed: {e}")
        
        api_key = os.getenv('SERPAPI_KEY')
        if not api_key:
            return {'error': 'SERPAPI_KEY not configured'}
        
        keywords = watch.keywords
        if not keywords:
            return {'error': 'No keywords configured'}
        
        new_alerts = []
        
        try:
            keyword_str = ' OR '.join(keywords[:3])
            
            news_query = f"{keyword_str} (startup OR funding OR launch OR announces)"
            news_params = {
                'engine': 'google',
                'q': news_query,
                'api_key': api_key,
                'tbm': 'nws',
                'num': 10,
                'tbs': f'qdr:w'
            }
            
            news_search = GoogleSearch(news_params)
            news_results = news_search.get_dict()
            
            for result in news_results.get('news_results', [])[:10]:
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                url = result.get('link', '')
                
                if not url:
                    continue
                
                existing = CompetitorAlert.find_by_url(watch.id, url)
                if existing:
                    continue
                
                alert_type = CompetitorMonitoringService.classify_alert_type(title, snippet)
                relevance = CompetitorMonitoringService.calculate_relevance(result, keywords)
                
                if relevance >= 0.3:
                    alert = CompetitorAlert(
                        watch_id=watch.id,
                        alert_type=alert_type,
                        title=title,
                        snippet=snippet,
                        url=url,
                        source='google_news',
                        relevance_score=relevance
                    )
                    alert.save()
                    new_alerts.append(alert)
            
            search_query = f"{keyword_str} startup OR company"
            search_params = {
                'engine': 'google',
                'q': search_query,
                'api_key': api_key,
                'num': 5
            }
            
            search = GoogleSearch(search_params)
            search_results = search.get_dict()
            
            for result in search_results.get('organic_results', [])[:5]:
                title = result.get('title', '')
                snippet = result.get('snippet', '')
                url = result.get('link', '')
                
                if not url:
                    continue
                
                existing = CompetitorAlert.find_by_url(watch.id, url)
                if existing:
                    continue
                
                alert_type = CompetitorMonitoringService.classify_alert_type(title, snippet)
                relevance = CompetitorMonitoringService.calculate_relevance(result, keywords)
                
                if relevance >= 0.4:
                    alert = CompetitorAlert(
                        watch_id=watch.id,
                        alert_type=alert_type,
                        title=title,
                        snippet=snippet,
                        url=url,
                        source='google_search',
                        relevance_score=relevance
                    )
                    alert.save()
                    new_alerts.append(alert)
            
            watch.last_scan_at = datetime.utcnow()
            watch.save()
            
            return {
                'success': True,
                'new_alerts': len(new_alerts),
                'watch_id': watch_id
            }
            
        except Exception as e:
            print(f"Error scanning competitors for watch {watch_id}: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def create_watch_for_idea(idea_id):
        from app.models.user_model import Idea
        
        idea = Idea.find_by_id(idea_id)
        if not idea:
            return {'error': 'Idea not found'}
        
        keywords = CompetitorMonitoringService.extract_keywords(idea)
        
        if not keywords:
            keywords = [idea.title.lower()] if idea.title else ["startup", "new company"]
        
        watch = CompetitorWatch(
            idea_id=idea_id,
            keywords=keywords,
            is_active=True,
            scan_frequency='daily'
        )
        watch.save()
        
        return {'success': True, 'watch': watch}
