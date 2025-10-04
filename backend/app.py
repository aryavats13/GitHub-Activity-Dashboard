import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from analyzer import GitHubAnalyzer
from auth import auth_bp
from model import db
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Config DB
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///github_analysis.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Init DB
db.init_app(app)

# Enable CORS
CORS(app)  # Allow React to connect from different port
app.register_blueprint(auth_bp, url_prefix="/api/auth")

with app.app_context():
    db.create_all()

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'API is running'})

def get_token(data):
    """Helper to get token from request JSON or .env"""
    token = data.get('token')
    if not token:
        token = os.getenv('GITHUB_TOKEN')
    return token

@app.route('/api/analyze/repos/<username>', methods=['POST'])
def get_repos(username):
    """Get all repositories for a user"""
    try:
        data = request.json or {}
        token = get_token(data)

        analyzer = GitHubAnalyzer(username, token)
        repos_df = analyzer.get_user_repos()

        if repos_df is None or repos_df.empty:
            return jsonify({'error': 'No repositories found'}), 404

        repos_dict = repos_df.to_dict('records')
        for repo in repos_dict:
            for key in ['created_at', 'updated_at', 'pushed_at']:
                if key in repo and repo[key]:
                    repo[key] = str(repo[key])

        return jsonify({
            'repos': repos_dict,
            'count': len(repos_df)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/commits/<username>', methods=['POST'])
def get_commits(username):
    """Get commits for a user"""
    try:
        data = request.json or {}
        token = get_token(data)
        max_repos = data.get('max_repos', 10)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()
        commits_df = analyzer.get_all_commits(max_repos=max_repos)

        if commits_df is None or commits_df.empty:
            return jsonify({'error': 'No commits found'}), 404

        commits_dict = commits_df.to_dict('records')
        for commit in commits_dict:
            if 'date' in commit and commit['date']:
                commit['date'] = str(commit['date'])

        stats = {
            'total_commits': len(commits_df),
            'active_repos': int(commits_df['repo_name'].nunique()),
            'days_active': int((commits_df['date'].max() - commits_df['date'].min()).days)
        }

        return jsonify({
            'commits': commits_dict,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/patterns/<username>', methods=['POST'])
def get_commit_patterns(username):
    """Get commit pattern analysis"""
    try:
        data = request.json or {}
        token = get_token(data)
        max_repos = data.get('max_repos', 10)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()
        analyzer.get_all_commits(max_repos=max_repos)

        if analyzer.commits_data is None or analyzer.commits_data.empty:
            return jsonify({'error': 'No commit data available'}), 404

        patterns = analyzer.analyze_commit_patterns()
        return jsonify(patterns)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/messages/<username>', methods=['POST'])
def get_message_analysis(username):
    """Get commit message analysis"""
    try:
        data = request.json or {}
        token = get_token(data)
        max_repos = data.get('max_repos', 10)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()
        analyzer.get_all_commits(max_repos=max_repos)

        if analyzer.commits_data is None or analyzer.commits_data.empty:
            return jsonify({'error': 'No commit data available'}), 404

        message_analysis = analyzer.analyze_commit_messages()
        return jsonify(message_analysis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/clustering/<username>', methods=['POST'])
def get_clustering(username):
    """Get repository clustering analysis"""
    try:
        data = request.json or {}
        token = get_token(data)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()

        if analyzer.repos_data is None or analyzer.repos_data.empty:
            return jsonify({'error': 'No repository data available'}), 404

        clustering_results = analyzer.cluster_repositories()
        if not clustering_results:
            return jsonify({'error': 'Not enough data for clustering'}), 400

        return jsonify(clustering_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/predictions/<username>', methods=['POST'])
def get_predictions(username):
    """Get activity predictions"""
    try:
        data = request.json or {}
        token = get_token(data)
        days = data.get('days', 30)
        max_repos = data.get('max_repos', 10)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()
        analyzer.get_all_commits(max_repos=max_repos)

        if analyzer.commits_data is None or analyzer.commits_data.empty:
            return jsonify({'error': 'No commit data available'}), 404

        predictions = analyzer.predict_future_activity(days_to_predict=days)
        return jsonify(predictions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/recommendations/<username>', methods=['POST'])
def get_recommendations(username):
    """Get personalized recommendations"""
    try:
        data = request.json or {}
        token = get_token(data)
        max_repos = data.get('max_repos', 10)

        analyzer = GitHubAnalyzer(username, token)
        analyzer.get_user_repos()
        analyzer.get_all_commits(max_repos=max_repos)

        if analyzer.commits_data is None or analyzer.commits_data.empty:
            return jsonify({'error': 'No commit data available'}), 404

        commit_patterns = analyzer.analyze_commit_patterns()
        message_analysis = analyzer.analyze_commit_messages()
        recommendations = analyzer.generate_recommendations(commit_patterns, message_analysis)

        return jsonify({
            'recommendations': recommendations,
            'patterns': commit_patterns,
            'message_analysis': message_analysis
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/full/<username>', methods=['POST'])
def full_analysis(username):
    """Get complete analysis in one call - RECOMMENDED"""
    try:
        data = request.json or {}
        token = get_token(data)
        max_repos = data.get('max_repos', 15)

        analyzer = GitHubAnalyzer(username, token)
        repos_df = analyzer.get_user_repos()
        if repos_df is None or repos_df.empty:
            return jsonify({'error': 'No repositories found'}), 404

        commits_df = analyzer.get_all_commits(max_repos=max_repos)
        if commits_df is None or commits_df.empty:
            return jsonify({'error': 'No commits found'}), 404

        commit_patterns = analyzer.analyze_commit_patterns()
        message_analysis = analyzer.analyze_commit_messages()
        clustering_results = analyzer.cluster_repositories()
        predictions = analyzer.predict_future_activity(days_to_predict=30)
        recommendations = analyzer.generate_recommendations(commit_patterns, message_analysis)

        repos_dict = repos_df.to_dict('records')
        for repo in repos_dict:
            for key in ['created_at', 'updated_at', 'pushed_at']:
                if key in repo and repo[key]:
                    repo[key] = str(repo[key])

        commits_dict = commits_df.to_dict('records')
        for commit in commits_dict:
            if 'date' in commit and commit['date']:
                commit['date'] = str(commit['date'])

        summary = {
            'total_repos': len(repos_df),
            'total_commits': len(commits_df),
            'active_repos': int(commits_df['repo_name'].nunique()),
            'days_active': int((commits_df['date'].max() - commits_df['date'].min()).days),
            'languages': repos_df['language'].value_counts().to_dict(),
            'avg_stars': float(repos_df['stars'].mean()),
            'avg_forks': float(repos_df['forks'].mean())
        }

        result = {
            'summary': summary,
            'repos': repos_dict,
            'commits': commits_dict[:100],  # limit for performance
            'patterns': commit_patterns,
            'message_analysis': message_analysis,
            'clustering': clustering_results,
            'predictions': predictions,
            'recommendations': recommendations
        }

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
