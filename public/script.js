// Configure marked for markdown rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Display current date
const dateElement = document.getElementById('date');
const today = new Date();
dateElement.textContent = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});

// Fetch and display questions
async function loadQuestions() {
    try {
        const response = await fetch('/api/today');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayQuestions(data);
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('error').innerHTML = `
            <div class="error">
                Failed to load questions: ${error.message}
            </div>
        `;
        document.getElementById('loading').style.display = 'none';
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function displayQuestions(questions) {
    document.getElementById('loading').style.display = 'none';
    const contentDiv = document.getElementById('content');
    const statsDiv = document.getElementById('stats');
    
    if (questions.length === 0) {
        contentDiv.innerHTML = `
            <div class="no-data">
                <h2>No questions yet today</h2>
                <p>Check back later or ask a question to get started!</p>
            </div>
        `;
        return;
    }

    // Calculate stats
    const totalQuestions = questions.length;

    // Display stats
    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${totalQuestions}</div>
            <div class="stat-label">Total Questions Today</div>
        </div>
    `;

    // Display questions
    contentDiv.innerHTML = questions.map(question => `
        <div class="question-card">
            <div class="question-header">
                <div class="question-prompt">${escapeHtml(question.prompt)}</div>
                <div class="question-meta">
                    ${question.language ? `<span class="badge language">${escapeHtml(question.language)}</span>` : ''}
                    ${question.sourceIde ? `<span class="badge ide">${escapeHtml(question.sourceIde)}</span>` : ''}
                    ${question.githubRepo ? `<span class="badge github"><a href="${escapeHtml(question.githubRepo)}" target="_blank" rel="noopener noreferrer">📁 Repo</a></span>` : ''}
                    <span class="badge time">${formatTime(question.askedAt)}</span>
                </div>
            </div>
            
            ${question.answers.length > 0 ? `
                <div class="answers-section">
                    <div class="answers-header">
                        ${question.answers.length} Answer${question.answers.length !== 1 ? 's' : ''}
                    </div>
                    ${question.answers.map(answer => `
                        <div class="answer ${answer.isCorrect ? 'correct' : ''}">
                            <div class="answer-content markdown-content">${marked.parse(answer.content)}</div>
                            <div class="answer-footer">
                                <span>${formatTime(answer.createdAt)}</span>
                                ${answer.isCorrect ? '<span class="correct-badge">✓ Correct</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #718096; font-style: italic;">No answers yet</p>'}
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load questions on page load
loadQuestions();

// Auto-refresh every 30 seconds
setInterval(loadQuestions, 30000);