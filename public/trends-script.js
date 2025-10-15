// Global chart instances
let temporalChart, languageChart, keywordsChart, ideChart, repoChart;

// State management
let currentDateRange = 'last-7-days';
let customStartDate = null;
let customEndDate = null;

// Helper function to calculate date range
function getDateRange(rangeType) {
    const today = new Date();
    let startDate, endDate;
    
    switch (rangeType) {
        case 'last-7-days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date(today);
            break;
        case 'last-30-days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            endDate = new Date(today);
            break;
        case 'last-90-days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 90);
            endDate = new Date(today);
            break;
        case 'custom':
            if (!customStartDate || !customEndDate) return null;
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
            break;
        case 'all-time':
        default:
            return null;
    }
    
    return {
        start: formatDateForQuery(startDate),
        end: formatDateForQuery(endDate)
    };
}

// Helper function to format date as YYYY-MM-DD
function formatDateForQuery(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format date nicely
function formatDateNice(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Event Listeners
document.getElementById('date-range').addEventListener('change', (e) => {
    currentDateRange = e.target.value;
    const customDatesDiv = document.getElementById('custom-dates');
    
    if (currentDateRange === 'custom') {
        customDatesDiv.style.display = 'block';
    } else {
        customDatesDiv.style.display = 'none';
        loadAllData();
    }
});

document.getElementById('apply-dates').addEventListener('click', () => {
    customStartDate = document.getElementById('start-date').value;
    customEndDate = document.getElementById('end-date').value;
    
    if (customStartDate && customEndDate) {
        loadAllData();
    } else {
        alert('Please select both start and end dates');
    }
});

document.getElementById('temporal-interval').addEventListener('change', () => {
    loadTemporalTrends();
});

// API Helper
async function fetchAPI(endpoint, params = {}) {
    const dateRange = getDateRange(currentDateRange);
    if (dateRange) {
        params.start = dateRange.start;
        params.end = dateRange.end;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/trends/${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Load all data
async function loadAllData() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').innerHTML = '';
        
        await Promise.all([
            loadOverview(),
            loadLanguages(),
            loadTemporalTrends(),
            loadKeywords(),
            loadIdes(),
            loadRepositories(),
            loadAnswerQuality()
        ]);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('overview-stats').style.display = 'grid';
        document.getElementById('charts-container').style.display = 'grid';
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').innerHTML = `
            <div class="error">
                Failed to load trends: ${error.message}
            </div>
        `;
    }
}

// Load overview stats
async function loadOverview() {
    const data = await fetchAPI('overview');
    const { overview } = data;
    
    document.getElementById('overview-stats').innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${overview.totalQuestions}</div>
            <div class="stat-label">Total Questions</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${overview.totalAnswers}</div>
            <div class="stat-label">Total Answers</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${overview.avgAnswersPerQuestion}</div>
            <div class="stat-label">Avg Answers/Question</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${(overview.correctAnswerRate * 100).toFixed(1)}%</div>
            <div class="stat-label">Correct Answer Rate</div>
        </div>
    `;
}

// Load temporal trends
async function loadTemporalTrends() {
    const interval = document.getElementById('temporal-interval').value;
    const data = await fetchAPI('temporal', { interval });
    
    const ctx = document.getElementById('temporal-chart');
    
    if (temporalChart) {
        temporalChart.destroy();
    }
    
    temporalChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.trends.map(t => formatDateNice(t.date)),
            datasets: [{
                label: 'Questions',
                data: data.trends.map(t => t.count),
                borderColor: '#1a202c',
                backgroundColor: 'rgba(26, 32, 44, 0.1)',
                tension: 0.3,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Load language distribution
async function loadLanguages() {
    const data = await fetchAPI('languages');
    const ctx = document.getElementById('language-chart');
    
    if (languageChart) {
        languageChart.destroy();
    }
    
    const colors = [
        '#1a202c', '#2d3748', '#4a5568', '#718096', '#a0aec0',
        '#cbd5e0', '#e2e8f0', '#edf2f7'
    ];
    
    languageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.languages.map(l => l.language),
            datasets: [{
                data: data.languages.map(l => l.count),
                backgroundColor: colors.slice(0, data.languages.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load keywords
async function loadKeywords() {
    const data = await fetchAPI('keywords', { limit: 15 });
    const ctx = document.getElementById('keywords-chart');
    
    if (keywordsChart) {
        keywordsChart.destroy();
    }
    
    keywordsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.keywords.map(k => k.keyword),
            datasets: [{
                label: 'Frequency',
                data: data.keywords.map(k => k.count),
                backgroundColor: '#1a202c',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Load IDE distribution
async function loadIdes() {
    const data = await fetchAPI('ides');
    const ctx = document.getElementById('ide-chart');
    
    if (ideChart) {
        ideChart.destroy();
    }
    
    const colors = ['#1a202c', '#2d3748', '#4a5568', '#718096'];
    
    ideChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.ides.map(i => i.ide),
            datasets: [{
                data: data.ides.map(i => i.count),
                backgroundColor: colors.slice(0, data.ides.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Load repositories
async function loadRepositories() {
    const data = await fetchAPI('repositories');
    const ctx = document.getElementById('repo-chart');
    
    if (repoChart) {
        repoChart.destroy();
    }
    
    // Only show top 10 repositories
    const topRepos = data.repositories.slice(0, 10);
    
    repoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topRepos.map(r => {
                const repo = r.repository;
                if (repo === 'none') return 'No Repository';
                // Extract repo name from URL if it's a URL
                if (repo.includes('github.com')) {
                    const parts = repo.split('/');
                    return parts[parts.length - 1] || repo;
                }
                return repo;
            }),
            datasets: [{
                label: 'Questions',
                data: topRepos.map(r => r.count),
                backgroundColor: '#1a202c',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Load answer quality metrics
async function loadAnswerQuality() {
    const data = await fetchAPI('answer-quality');
    const { quality } = data;
    
    document.getElementById('quality-metrics').innerHTML = `
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.totalQuestions}</div>
            <div class="quality-metric-label">Total Questions</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.questionsWithAnswers}</div>
            <div class="quality-metric-label">Answered</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.unansweredQuestions}</div>
            <div class="quality-metric-label">Unanswered</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${(quality.questionAnswerRate * 100).toFixed(1)}%</div>
            <div class="quality-metric-label">Answer Rate</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.questionsWithCorrectAnswer}</div>
            <div class="quality-metric-label">Correct Answers</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${(quality.correctAnswerRate * 100).toFixed(1)}%</div>
            <div class="quality-metric-label">Correct Rate</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.avgAnswersPerQuestion}</div>
            <div class="quality-metric-label">Avg Answers/Q</div>
        </div>
        <div class="quality-metric">
            <div class="quality-metric-value">${quality.avgResponseTimeSeconds}s</div>
            <div class="quality-metric-label">Avg Response Time</div>
        </div>
    `;
}

// Load data on page load
loadAllData();

