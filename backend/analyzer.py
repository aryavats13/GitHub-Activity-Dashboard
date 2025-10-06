import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
import requests
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob
import re
from collections import Counter
import warnings
from statsmodels.tsa.arima.model import ARIMA
from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings('ignore')

def initialize_nltk():
    """Initialize NLTK data"""
    nltk_data_dir = os.path.join(os.getcwd(), "nltk_data")
    os.makedirs(nltk_data_dir, exist_ok=True)
    
    if nltk_data_dir not in nltk.data.path:
        nltk.data.path.append(nltk_data_dir)
    
    try:
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=True)
        nltk.download('stopwords', download_dir=nltk_data_dir, quiet=True)
        nltk.download('wordnet', download_dir=nltk_data_dir, quiet=True)
        nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_dir, quiet=True)
        return True
    except Exception:
        return False

nltk_initialized = initialize_nltk()

def safe_preprocess_text(text):
    """Safely preprocess text for NLP analysis"""
    if not isinstance(text, str):
        return ""
    
    try:
        text = text.lower()
        text = re.sub(r'\W', ' ', text)
        
        if not nltk_initialized:
            return ' '.join(text.split())
        
        try:
            tokens = word_tokenize(text)
            stop_words = set(stopwords.words('english'))
            lemmatizer = WordNetLemmatizer()
            
            filtered_tokens = [
                lemmatizer.lemmatize(word) for word in tokens
                if word not in stop_words and len(word) > 2
            ]
            return ' '.join(filtered_tokens)
        except Exception:
            return ' '.join(text.split())
    except Exception:
        return text


class GitHubAnalyzer:
    def __init__(self, username, token=None):
        """Setup GitHub connection"""
        self.username = username
        self.token = token or os.getenv('GITHUB_TOKEN')
        self.base_url = "https://api.github.com"
        self.headers = {
            'Accept': 'application/vnd.github.v3+json'
        }
        if self.token:
            self.headers['Authorization'] = f'Bearer {self.token}'
        
        self.repos_data = None
        self.commits_data = None
        self.issues_data = None
        self.pull_requests_data = None
        
    def check_rate_limit(self):
        """Check GitHub API rate limit status"""
        try:
            response = requests.get(f"{self.base_url}/rate_limit", headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                core_rate = data['resources']['core']
                remaining = core_rate['remaining']
                return remaining > 0
            return False
        except Exception:
            return False

    def get_user_repos(self, per_page=100, max_pages=10):
        """Fetch all repositories (public + private) for the authenticated user"""
        if not self.token:
            return pd.DataFrame()  # cannot fetch private repos without token

        headers = {"Authorization": f"token {self.token}"}
        all_repos = []
        page = 1

        while page <= max_pages:
            url = f"{self.base_url}/user/repos"
            params = {"per_page": per_page, "page": page, "type": "all"}
            response = requests.get(url, headers=headers, params=params)

            if response.status_code != 200:
                break

            repos = response.json()
            all_repos.extend(repos)

            if len(repos) < per_page:
                break
            page += 1

        repos_df = pd.DataFrame([{
            'repo_id': repo['id'],
            'name': repo['name'],
            'description': repo.get('description') or '',
            'created_at': repo['created_at'],
            'updated_at': repo['updated_at'],
            'pushed_at': repo['pushed_at'],
            'language': repo['language'],
            'stars': repo['stargazers_count'],
            'forks': repo['forks_count'],
            'open_issues': repo['open_issues_count'],
            'size': repo['size'],
            'is_fork': repo['fork'],
            'url': repo['html_url'],
            'topics': ','.join(repo.get('topics', [])),
            'default_branch': repo['default_branch']
        } for repo in all_repos])

        for col in ['created_at', 'updated_at', 'pushed_at']:
            if col in repos_df.columns:
                repos_df[col] = pd.to_datetime(repos_df[col])

        self.repos_data = repos_df
        return repos_df

    def get_commits_for_repo(self, repo_name, per_page=50, max_pages=5):
        """Fetch commits for a given repository"""
        all_commits = []
        page = 1

        while page <= max_pages:
            url = f"{self.base_url}/repos/{self.username}/{repo_name}/commits"
            params = {"per_page": per_page, "page": page}
            response = requests.get(url, headers=self.headers, params=params)

            if response.status_code != 200:
                break

            commits = response.json()
            if not commits:
                break

            for commit in commits:
                commit_data = commit.get("commit", {})
                author_data = commit_data.get("author", {})

                all_commits.append({
                    "repo_name": repo_name,
                    "sha": commit.get("sha"),
                    "message": commit_data.get("message"),
                    "author_name": author_data.get("name"),
                    "author_email": author_data.get("email"),
                    "date": author_data.get("date"),
                    "url": commit.get("html_url")
                })

            if len(commits) < per_page:
                break

            page += 1

        return all_commits

    def get_all_commits(self, max_repos=None):
        """Fetch commits from all repositories or a subset"""
        if self.repos_data is None:
            self.get_user_repos()
            
        if self.repos_data.empty:
            return pd.DataFrame()
        
        all_commits = []
        repos_to_process = self.repos_data['name'].head(max_repos).tolist() if max_repos else self.repos_data['name'].tolist()
        
        for repo_name in repos_to_process:
            commits = self.get_commits_for_repo(repo_name)
            all_commits.extend(commits)
        
        commits_df = pd.DataFrame(all_commits)
        
        if not commits_df.empty:
            commits_df['date'] = pd.to_datetime(commits_df['date'])
            commits_df['message_length'] = commits_df['message'].str.len()
            commits_df['hour'] = commits_df['date'].dt.hour
            commits_df['day'] = commits_df['date'].dt.day_name()
            commits_df['month'] = commits_df['date'].dt.month_name()
            commits_df['year'] = commits_df['date'].dt.year
            commits_df['weekday'] = commits_df['date'].dt.dayofweek
            
            commits_df['sentiment'] = commits_df['message'].apply(
                lambda x: TextBlob(x).sentiment.polarity if pd.notnull(x) else 0
            )
            
            commits_df['is_short_message'] = commits_df['message_length'] < 10
            commits_df['has_fix_keyword'] = commits_df['message'].str.contains(
                r'\b(fix|fixes|fixed|bug|issue)\b', case=False, regex=True
            ).fillna(False)
        
        self.commits_data = commits_df
        return commits_df

    
    def analyze_commit_patterns(self):
        """Analyze commit patterns and return insights"""
        if self.commits_data is None or self.commits_data.empty:
            return {}
            
        hourly_commits = self.commits_data['hour'].value_counts().sort_index()
        daily_commits = self.commits_data['day'].value_counts()
        monthly_commits = self.commits_data['month'].value_counts()
        
        peak_hour = hourly_commits.idxmax()
        peak_day = daily_commits.idxmax()
        
        avg_message_length = self.commits_data['message_length'].mean()
        short_commits_pct = self.commits_data['is_short_message'].mean() * 100
        fix_commits_pct = self.commits_data['has_fix_keyword'].mean() * 100
        
        self.commits_data = self.commits_data.sort_values('date')
        commits_by_date = self.commits_data.groupby(self.commits_data['date'].dt.date).size()
        
        date_range = pd.date_range(
            start=commits_by_date.index.min(),
            end=commits_by_date.index.max()
        )
        commits_by_date = commits_by_date.reindex(date_range, fill_value=0)
        
        streaks = []
        current_streak = 0
        
        for count in commits_by_date:
            if count > 0:
                current_streak += 1
            else:
                streaks.append(current_streak)
                current_streak = 0
                
        streaks.append(current_streak)
        longest_streak = max(streaks) if streaks else 0
        
        gaps = []
        current_gap = 0
        
        for count in commits_by_date:
            if count == 0:
                current_gap += 1
            else:
                gaps.append(current_gap)
                current_gap = 0
                
        gaps.append(current_gap)
        longest_gap = max(gaps) if gaps else 0
        
        return {
            'total_commits': len(self.commits_data),
            'repos_with_commits': self.commits_data['repo_name'].nunique(),
            'peak_hour': int(peak_hour),
            'peak_day': peak_day,
            'avg_message_length': float(avg_message_length),
            'short_commits_pct': float(short_commits_pct),
            'fix_commits_pct': float(fix_commits_pct),
            'longest_streak': int(longest_streak),
            'longest_gap': int(longest_gap),
            'hourly_commits': hourly_commits.to_dict(),
            'daily_commits': daily_commits.to_dict(),
            'monthly_commits': monthly_commits.to_dict()
        }
    
    def analyze_commit_messages(self):
        """Use NLP to analyze commit message content"""
        if self.commits_data is None or self.commits_data.empty:
            return {}
        
        self.commits_data['processed_message'] = self.commits_data['message'].apply(safe_preprocess_text)
        
        all_words = " ".join(self.commits_data['processed_message']).split()
        word_freq = Counter(all_words).most_common(20)
        
        action_words = ['add', 'update', 'fix', 'remove', 'implement', 'refactor', 'change', 'merge']
        action_counts = {
            word: sum(1 for msg in self.commits_data['message'] if re.search(fr'\b{word}\b', msg, re.IGNORECASE))
            for word in action_words
        }
        
        sentiment_dist = self.commits_data['sentiment'].describe().to_dict()
        
        repo_top_terms = {}
        if len(self.commits_data['repo_name'].unique()) > 1:
            tfidf = TfidfVectorizer(max_features=100)
            repo_messages = self.commits_data.groupby('repo_name')['processed_message'].apply(' '.join)
            
            if len(repo_messages) > 1:
                try:
                    tfidf_matrix = tfidf.fit_transform(repo_messages)
                    feature_names = tfidf.get_feature_names_out()
                    
                    for i, repo in enumerate(repo_messages.index):
                        tfidf_scores = zip(feature_names, tfidf_matrix[i].toarray()[0])
                        repo_top_terms[repo] = sorted(tfidf_scores, key=lambda x: x[1], reverse=True)[:5]
                except:
                    pass
            
        return {
            'word_freq': word_freq,
            'action_counts': action_counts,
            'sentiment_dist': sentiment_dist,
            'repo_top_terms': repo_top_terms
        }
    
    def predict_future_activity(self, days_to_predict=30):
        """Predict future commit activity using time series forecasting"""
        if self.commits_data is None or self.commits_data.empty:
            return {}
            
        commits_by_date = self.commits_data.groupby(self.commits_data['date'].dt.date).size()
        
        if len(commits_by_date) < 14:
            return {
                'enough_data': False,
                'message': 'Need at least 14 days of commit data for forecasting'
            }
            
        date_range = pd.date_range(
            start=commits_by_date.index.min(),
            end=commits_by_date.index.max()
        )
        daily_commits = commits_by_date.reindex(date_range, fill_value=0)
        
        try:
            model = ARIMA(daily_commits.values, order=(5, 1, 0))
            model_fit = model.fit()
            
            forecast = model_fit.forecast(steps=days_to_predict)
            forecast_dates = pd.date_range(
                start=daily_commits.index[-1] + timedelta(days=1),
                periods=days_to_predict
            )
            
            forecast = np.maximum(forecast, 0)
            
            return {
                'enough_data': True,
                'forecast': forecast.tolist(),
                'forecast_dates': [d.strftime('%Y-%m-%d') for d in forecast_dates],
                'historical': {str(k): int(v) for k, v in daily_commits.items()}
            }
        except:
            return {
                'enough_data': False,
                'message': 'Unable to create forecast with available data'
            }
    
    def generate_recommendations(self, commit_patterns, message_analysis):
        """Generate personalized Git workflow recommendations"""
        if not commit_patterns or not message_analysis:
            return []
            
        recommendations = []
        
        peak_hour = commit_patterns.get('peak_hour')
        if peak_hour is not None:
            if 22 <= peak_hour or peak_hour <= 5:
                recommendations.append({
                    'category': 'Work Schedule',
                    'title': 'Consider adjusting your coding hours',
                    'description': f"You commit most frequently at {peak_hour}:00, which may affect your sleep schedule. Consider shifting your coding sessions to daytime hours for better work-life balance."
                })
                
        short_pct = commit_patterns.get('short_commits_pct', 0)
        if short_pct > 30:
            recommendations.append({
                'category': 'Commit Quality',
                'title': 'Improve commit message clarity',
                'description': f"{short_pct:.1f}% of your commit messages are very short (<10 chars). More descriptive commit messages make your repository history more valuable and easier to navigate."
            })
            
        fix_pct = commit_patterns.get('fix_commits_pct', 0)
        if fix_pct > 25:
            recommendations.append({
                'category': 'Testing',
                'title': 'Consider implementing more tests',
                'description': f"{fix_pct:.1f}% of your commits contain fix-related keywords. More thorough testing before commits could reduce the need for fixes and improve code quality."
            })
            
        longest_gap = commit_patterns.get('longest_gap', 0)
        if longest_gap > 14:
            recommendations.append({
                'category': 'Consistency',
                'title': 'Maintain a more consistent coding schedule',
                'description': f"Your longest gap between commits was {longest_gap} days. More consistent contributions, even if smaller, can help maintain momentum in your projects."
            })
            
        sentiment_dist = message_analysis.get('sentiment_dist', {})
        if sentiment_dist.get('mean', 0) < -0.1:
            recommendations.append({
                'category': 'Communication',
                'title': 'Consider more positive framing in commit messages',
                'description': "Your commit messages tend to have a negative sentiment. While technical accuracy is most important, positive framing can improve team morale when working with others."
            })
            
        recommendations.append({
            'category': 'Tooling',
            'title': 'Consider using commit message templates',
            'description': "Setting up commit templates can help standardize your commit messages and ensure they contain all needed information. Add them with: git config --global commit.template ~/.gitmessage"
        })
        
        return recommendations
    
    def cluster_repositories(self):
        """Cluster repositories based on their characteristics"""
        if self.repos_data is None or self.repos_data.empty or len(self.repos_data) < 3:
            return {}
            
        features = ['stars', 'forks', 'open_issues', 'size']
        
        for feature in features:
            if feature not in self.repos_data.columns:
                return {}
                
        X = self.repos_data[features].fillna(0)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        max_clusters = min(5, len(self.repos_data) - 1)
        if max_clusters < 2:
            return {}
            
        wcss = []
        for i in range(1, max_clusters + 1):
            kmeans = KMeans(n_clusters=i, random_state=42, n_init=10)
            kmeans.fit(X_scaled)
            wcss.append(kmeans.inertia_)
            
        optimal_clusters = 2
        for i in range(1, len(wcss) - 1):
            if (wcss[i-1] - wcss[i]) / (wcss[i] - wcss[i+1]) > 2:
                optimal_clusters = i + 1
                break
                
        kmeans = KMeans(n_clusters=optimal_clusters, random_state=42, n_init=10)
        self.repos_data['cluster'] = kmeans.fit_predict(X_scaled)
        
        centers = scaler.inverse_transform(kmeans.cluster_centers_)
        cluster_profiles = pd.DataFrame(centers, columns=features)
        
        cluster_names = []
        for i, profile in cluster_profiles.iterrows():
            if profile['stars'] > profile['forks'] * 2:
                name = "Popular/Starred"
            elif profile['open_issues'] > profile['stars']:
                name = "Active Development"
            elif profile['size'] > cluster_profiles['size'].median() * 2:
                name = "Large Projects"
            else:
                name = f"Cluster {i+1}"
            cluster_names.append(name)
            
        cluster_profiles['name'] = cluster_names
        
        return {
            'repos_with_clusters': self.repos_data[['name', 'stars', 'forks', 'open_issues', 'size', 'cluster']].to_dict('records'),
            'cluster_profiles': cluster_profiles.to_dict('records')
        }