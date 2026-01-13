(function() {
	// Data schema: { id, category, text, options: [a,b,c,d], correctIndex }
	const STORAGE_KEY = 'quiz_questions';
	const RESULTS_KEY = 'quiz_results';
	
	// DOM Elements
	const adminModeBtn = document.getElementById('adminModeBtn');
	const assessmentModeBtn = document.getElementById('assessmentModeBtn');
	const adminMode = document.getElementById('adminMode');
	const assessmentMode = document.getElementById('assessmentMode');
	
	// Admin elements
	const form = document.getElementById('questionForm');
	const roundSelect = document.getElementById('roundSelect');
	const questionText = document.getElementById('questionText');
	const seedBtn = document.getElementById('seedBtn');
	const questionList = document.getElementById('questionList');
	const exportBtn = document.getElementById('exportBtn');
	const importBtn = document.getElementById('importBtn');
	const importInput = document.getElementById('importInput');
	const clearAllBtn = document.getElementById('clearAllBtn');
	
	// Assessment elements
	const timeLimit = document.getElementById('timeLimit');
	const questionCount = document.getElementById('questionCount');
	const difficultyFilter = document.getElementById('difficultyFilter');
	const startAssessment = document.getElementById('startAssessment');
	const assessmentProgress = document.getElementById('assessmentProgress');
	const assessmentSetup = document.querySelector('.assessment-setup');
	const resultsDisplay = document.getElementById('resultsDisplay');
	
	// Assessment progress elements
	const questionCounter = document.getElementById('questionCounter');
	const progressFill = document.getElementById('progressFill');
	const timer = document.getElementById('timer');
	const pauseBtn = document.getElementById('pauseBtn');
	const questionDisplay = document.getElementById('questionDisplay');
	const prevBtn = document.getElementById('prevBtn');
	const nextBtn = document.getElementById('nextBtn');
	const submitAssessment = document.getElementById('submitAssessment');
	
	// Results elements
	const scorePercentage = document.getElementById('scorePercentage');
	const correctCount = document.getElementById('correctCount');
	const totalCount = document.getElementById('totalCount');
	const reviewAnswers = document.getElementById('reviewAnswers');
	const retakeAssessment = document.getElementById('retakeAssessment');
	const reviewSection = document.getElementById('reviewSection');
	const reviewContent = document.getElementById('reviewContent');
	
	// Application state
	let currentMode = 'admin';
	let assessmentQuestions = [];
	let currentQuestionIndex = 0;
	let userAnswers = {};
	let timerId = null;
	let remainingSeconds = 0;
	let isPaused = false;
	let assessmentStartTime = null;
	
	// Initialize application
	init();
	
	function init() {
		setupEventListeners();
		renderQuestionList();
		updateModeDisplay();
	}
	
	function setupEventListeners() {
		// Mode switching
		adminModeBtn.addEventListener('click', () => switchMode('admin'));
		assessmentModeBtn.addEventListener('click', () => switchMode('assessment'));
		
		// Admin panel events
		form.addEventListener('submit', handleFormSubmit);
		seedBtn.addEventListener('click', seedDemoData);
		exportBtn.addEventListener('click', exportQuestions);
		importBtn.addEventListener('click', () => importInput.click());
		importInput.addEventListener('change', handleImport);
		clearAllBtn.addEventListener('click', clearAllQuestions);
		questionList.addEventListener('click', handleQuestionListClick);
		
		// Assessment events
		startAssessment.addEventListener('click', startAssessmentFlow);
		prevBtn.addEventListener('click', () => navigateQuestion(-1));
		nextBtn.addEventListener('click', () => navigateQuestion(1));
		submitAssessment.addEventListener('click', submitAssessmentFlow);
		pauseBtn.addEventListener('click', togglePause);
		reviewAnswers.addEventListener('click', toggleReview);
		retakeAssessment.addEventListener('click', resetAssessment);
	}
	
	function switchMode(mode) {
		currentMode = mode;
		updateModeDisplay();
		
		if (mode === 'assessment') {
			assessmentSetup.classList.remove('hidden');
			assessmentProgress.classList.add('hidden');
			resultsDisplay.classList.add('hidden');
		}
	}
	
	function updateModeDisplay() {
		// Update button states
		adminModeBtn.classList.toggle('active', currentMode === 'admin');
		assessmentModeBtn.classList.toggle('active', currentMode === 'assessment');
		
		// Update content visibility
		adminMode.style.display = currentMode === 'admin' ? 'block' : 'none';
		assessmentMode.style.display = currentMode === 'assessment' ? 'block' : 'none';
	}
	
	// Question Management Functions
	function getQuestions() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		} catch {
			return [];
		}
	}
	
	function saveQuestions(questions) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
	}
	
	function addQuestion(question) {
		const questions = getQuestions();
		const newQuestion = {
			id: Date.now(),
			category: question.category,
			text: question.text,
			options: question.options,
			correctIndex: question.correctIndex
		};
		questions.push(newQuestion);
		saveQuestions(questions);
		return newQuestion;
	}
	
	function deleteQuestion(id) {
		const questions = getQuestions();
		const filtered = questions.filter(q => q.id !== id);
		saveQuestions(filtered);
	}
	
	function clearAllQuestions() {
		if (confirm('Are you sure you want to delete all questions? This action cannot be undone.')) {
			saveQuestions([]);
			renderQuestionList();
			showNotification('All questions deleted', 'success');
		}
	}
	
	function handleFormSubmit(e) {
		e.preventDefault();
		
		const question = questionText.value.trim();
		const category = roundSelect.value;
		const optionInputs = form.querySelectorAll('input.opt');
		const options = Array.from(optionInputs).map(input => input.value.trim());
		const correctRadio = form.querySelector('input[name="correct"]:checked');
		const correctIndex = parseInt(correctRadio.value);
		
		// Validation
		if (!question) {
			showNotification('Please enter a question', 'error');
			questionText.focus();
			return;
		}
		
		const filledOptions = options.filter(opt => opt);
		if (filledOptions.length < 2) {
			showNotification('Please provide at least 2 answer options', 'error');
			return;
		}
		
		if (filledOptions.length !== options.length) {
			showNotification('Please fill all answer options', 'error');
			return;
		}
		
		// Check for duplicate options
		const uniqueOptions = new Set(filledOptions.map(o => o.toLowerCase()));
		if (uniqueOptions.size !== filledOptions.length) {
			showNotification('Answer options must be unique', 'error');
			return;
		}
		
		try {
			addQuestion({
				category,
				text: question,
				options: filledOptions,
				correctIndex
			});
			
			clearForm();
			renderQuestionList();
			showNotification('Question saved successfully!', 'success');
		} catch (error) {
			showNotification('Failed to save question', 'error');
		}
	}
	
	function clearForm() {
		questionText.value = '';
		form.querySelectorAll('input.opt').forEach((input, idx) => {
			input.value = '';
			input.placeholder = `Option ${String.fromCharCode(65 + idx)}`;
		});
		form.querySelector('input[type="radio"][value="0"]').checked = true;
	}
	
	function renderQuestionList() {
		const questions = getQuestions();
		
		if (questions.length === 0) {
			questionList.innerHTML = `
				<div class="empty-state">
					<p>No questions added yet.</p>
					<p>Click "Add Demo Questions" to get started or create your own questions above.</p>
				</div>
			`;
			return;
		}
		
		// Group questions by category
		const grouped = questions.reduce((acc, q) => {
			if (!acc[q.category]) acc[q.category] = [];
			acc[q.category].push(q);
			return acc;
		}, {});
		
		let html = `
			<div class="question-summary">
				<h3>Question Summary</h3>
				<div class="summary-stats">
					<span class="stat">Total: ${questions.length}</span>
					<span class="stat">Assessment: ${(grouped.assessment || []).length}</span>
					<span class="stat">Operations: ${(grouped.ops || []).length}</span>
					<span class="stat">HR: ${(grouped.hr || []).length}</span>
				</div>
			</div>
		`;
		
		// Render questions by category
		['assessment', 'ops', 'hr'].forEach(category => {
			const categoryQuestions = grouped[category] || [];
			if (categoryQuestions.length === 0) return;
			
			const categoryName = category === 'ops' ? 'Operations' : category.charAt(0).toUpperCase() + category.slice(1);
			
			html += `<h4 class="category-header">${categoryName} (${categoryQuestions.length} questions)</h4>`;
			
			categoryQuestions.forEach((q, idx) => {
				html += `
					<div class="question-item">
						<div class="question-content">
							<div class="question-header">
								<span class="question-number">${idx + 1}.</span>
								<span class="question-text">${escapeHtml(q.text)}</span>
							</div>
							<div class="question-options">
								${q.options.map((opt, oIdx) => 
									`<span class="option ${oIdx === q.correctIndex ? 'correct' : ''}">${escapeHtml(opt)}</span>`
								).join(' • ')}
							</div>
						</div>
						<div class="question-actions">
							<button class="btn edit" data-id="${q.id}" title="Edit question">Edit</button>
							<button class="btn duplicate" data-id="${q.id}" title="Duplicate question">Copy</button>
							<button class="btn delete" data-id="${q.id}" title="Delete question">Delete</button>
						</div>
					</div>
				`;
			});
		});
		
		questionList.innerHTML = html;
	}
	
	function handleQuestionListClick(e) {
		const target = e.target;
		if (!target.classList.contains('btn')) return;
		
		const id = parseInt(target.getAttribute('data-id'));
		if (!id) return;
		
		if (target.classList.contains('edit')) {
			editQuestion(id);
		} else if (target.classList.contains('duplicate')) {
			duplicateQuestion(id);
		} else if (target.classList.contains('delete')) {
			if (confirm('Are you sure you want to delete this question?')) {
				deleteQuestion(id);
				renderQuestionList();
				showNotification('Question deleted', 'success');
			}
		}
	}
	
	function editQuestion(id) {
		const questions = getQuestions();
		const question = questions.find(q => q.id === id);
		if (!question) return;
		
		// Populate form
		roundSelect.value = question.category;
		questionText.value = question.text;
		
		const optionInputs = form.querySelectorAll('input.opt');
		question.options.forEach((option, idx) => {
			if (optionInputs[idx]) {
				optionInputs[idx].value = option;
			}
		});
		
		form.querySelector(`input[type="radio"][value="${question.correctIndex}"]`).checked = true;
		
		// Scroll to form
		form.scrollIntoView({ behavior: 'smooth' });
		questionText.focus();
		
		showNotification('Question loaded for editing', 'info');
	}
	
	function duplicateQuestion(id) {
		const questions = getQuestions();
		const question = questions.find(q => q.id === id);
		if (!question) return;
		
		const duplicated = {
			category: question.category,
			text: question.text + ' (Copy)',
			options: [...question.options],
			correctIndex: question.correctIndex
		};
		
		addQuestion(duplicated);
		renderQuestionList();
		showNotification('Question duplicated', 'success');
	}
	// question seeding
	function seedDemoData() {
		const demoQuestions = [
			{
				category: 'assessment',
				text: 'What does HTML stand for?',
				options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlinking Textual Mark Language', 'Home Tool Markup Language'],
				correctIndex: 0
			},
			{
				category: 'assessment',
				text: '1. Seating Arrangement Five friends – A, B, C, D, and E – are sitting in a row facing north. A is to the immediate right of B. C is to the right of D but not next to E. E is at one end of the row.',
				options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlinking Textual Mark Language', 'Home Tool Markup Language'],
				correctIndex: 0
			},
			{
				category: 'assessment',
				text: 'What does HTML stand for?',
				options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlinking Textual Mark Language', 'Home Tool Markup Language'],
				correctIndex: 0
			},
			{
				category: 'assessment',
				text: 'Which CSS property is used to change the text color?',
				options: ['font-color', 'text-color', 'color', 'text-style'],
				correctIndex: 2
			},
			{
				category: 'ops',
				text: 'Which command lists files in Unix/Linux?',
				options: ['ps', 'ls', 'cd', 'pwd'],
				correctIndex: 1
			},
			{
				category: 'ops',
				text: 'What does API stand for?',
				options: ['Application Programming Interface', 'Advanced Programming Interface', 'Automated Programming Interface', 'Application Process Integration'],
				correctIndex: 0
			},
			{
				category: 'hr',
				text: 'What is the most important skill in teamwork?',
				options: ['Competition', 'Communication', 'Individual performance', 'Silence'],
				correctIndex: 1
			},
			{
				category: 'hr',
				text: 'What is the primary goal of performance reviews?',
				options: ['To criticize employees', 'To provide feedback and development', 'To reduce salaries', 'To create stress'],
				correctIndex: 1
			}
		];
		
		demoQuestions.forEach(q => addQuestion(q));
		renderQuestionList();
		showNotification('Demo questions added successfully!', 'success');
	}
	
	function exportQuestions() {
		const questions = getQuestions();
		if (questions.length === 0) {
			showNotification('No questions to export', 'error');
			return;
		}
		
		const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'quiz-questions.json';
		a.click();
		URL.revokeObjectURL(url);
		
		showNotification('Questions exported successfully', 'success');
	}
	
	function handleImport(e) {
		const file = e.target.files[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const importedQuestions = JSON.parse(event.target.result);
				if (!Array.isArray(importedQuestions)) {
					throw new Error('Invalid format');
				}
				
				const existingQuestions = getQuestions();
				const newQuestions = [...existingQuestions, ...importedQuestions];
				saveQuestions(newQuestions);
				renderQuestionList();
				
				showNotification(`${importedQuestions.length} questions imported successfully`, 'success');
			} catch (error) {
				showNotification('Invalid file format', 'error');
			}
		};
		reader.readAsText(file);
		e.target.value = ''; // Reset input
	}
	
	// Assessment Functions
	function startAssessmentFlow() {
		const questions = getQuestions();
		if (questions.length === 0) {
			showNotification('No questions available. Please add some questions first.', 'error');
			return;
		}
		
		const selectedCategory = difficultyFilter.value;
		const maxQuestions = questionCount.value === 'all' ? questions.length : parseInt(questionCount.value);
		
		// Filter questions by category
		let filteredQuestions = questions;
		if (selectedCategory !== 'all') {
			filteredQuestions = questions.filter(q => q.category === selectedCategory);
		}
		
		if (filteredQuestions.length === 0) {
			showNotification(`No questions available for ${selectedCategory} category`, 'error');
			return;
		}
		
		// Shuffle and limit questions
		assessmentQuestions = shuffleArray(filteredQuestions).slice(0, Math.min(maxQuestions, filteredQuestions.length));
		currentQuestionIndex = 0;
		userAnswers = {};
		
		// Start assessment
		assessmentSetup.classList.add('hidden');
		assessmentProgress.classList.remove('hidden');
		
		// Set timer
		const timeMinutes = parseInt(timeLimit.value);
		remainingSeconds = timeMinutes * 60;
		startTimer();
		
		// Show first question
		displayCurrentQuestion();
		updateProgress();
		
		assessmentStartTime = Date.now();
	}
	
	function displayCurrentQuestion() {
		if (currentQuestionIndex >= assessmentQuestions.length) return;
		
		const question = assessmentQuestions[currentQuestionIndex];
		const questionNumber = currentQuestionIndex + 1;
		
		let html = `
			<div class="question-header">
				<h3>Question ${questionNumber}</h3>
				<span class="category-badge">${question.category}</span>
			</div>
			<div class="question-text">${escapeHtml(question.text)}</div>
			<div class="options-container">
		`;
		
		question.options.forEach((option, index) => {
			const optionId = `q${question.id}_${index}`;
			const isSelected = userAnswers[question.id] === index;
			const selectedClass = isSelected ? 'selected' : '';
			
			html += `
				<label class="option-item ${selectedClass}" for="${optionId}">
					<input type="radio" id="${optionId}" name="q${question.id}" value="${index}" 
						   ${isSelected ? 'checked' : ''} onchange="handleAnswerChange(${question.id}, ${index})">
					<span class="option-letter">${String.fromCharCode(65 + index)}</span>
					<span class="option-text">${escapeHtml(option)}</span>
				</label>
			`;
		});
		
		html += '</div>';
		questionDisplay.innerHTML = html;
		
		// Update navigation buttons
		prevBtn.disabled = currentQuestionIndex === 0;
		nextBtn.disabled = currentQuestionIndex === assessmentQuestions.length - 1;
		
		if (currentQuestionIndex === assessmentQuestions.length - 1) {
			nextBtn.style.display = 'none';
			submitAssessment.style.display = 'inline-block';
		} else {
			nextBtn.style.display = 'inline-block';
			submitAssessment.style.display = 'none';
		}
	}
	
	function handleAnswerChange(questionId, answerIndex) {
		userAnswers[questionId] = answerIndex;
		
		// Update visual state
		const question = assessmentQuestions.find(q => q.id === questionId);
		if (question) {
			const optionItems = document.querySelectorAll(`input[name="q${questionId}"]`);
			optionItems.forEach((input, index) => {
				const label = input.closest('.option-item');
				label.classList.toggle('selected', index === answerIndex);
			});
		}
	}
	
	function navigateQuestion(direction) {
		const newIndex = currentQuestionIndex + direction;
		if (newIndex >= 0 && newIndex < assessmentQuestions.length) {
			currentQuestionIndex = newIndex;
			displayCurrentQuestion();
			updateProgress();
		}
	}
	
	function updateProgress() {
		const progress = ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100;
		progressFill.style.width = `${progress}%`;
		questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${assessmentQuestions.length}`;
	}
	
	function startTimer() {
		clearInterval(timerId);
		timerId = setInterval(() => {
			if (!isPaused) {
				remainingSeconds--;
				updateTimerDisplay();
				
				if (remainingSeconds <= 0) {
					clearInterval(timerId);
					submitAssessmentFlow();
				}
			}
		}, 1000);
	}
	
	function updateTimerDisplay() {
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;
		timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		
		// Change color when time is running low
		if (remainingSeconds <= 60) {
			timer.classList.add('warning');
		} else {
			timer.classList.remove('warning');
		}
	}
	
	function togglePause() {
		isPaused = !isPaused;
		pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
		
		if (isPaused) {
			clearInterval(timerId);
		} else {
			startTimer();
		}
	}
	
	function submitAssessmentFlow() {
		clearInterval(timerId);
		
		const results = calculateResults();
		displayResults(results);
		
		// Save results
		const assessmentResults = {
			...results,
			timestamp: Date.now(),
			duration: Date.now() - assessmentStartTime,
			questions: assessmentQuestions.length
		};
		
		saveResults(assessmentResults);
		
		assessmentProgress.classList.add('hidden');
		resultsDisplay.classList.remove('hidden');
	}
	
	function calculateResults() {
		let correct = 0;
		let total = assessmentQuestions.length;
		
		assessmentQuestions.forEach(question => {
			const userAnswer = userAnswers[question.id];
			if (userAnswer === question.correctIndex) {
				correct++;
			}
		});
		
		const percentage = Math.round((correct / total) * 100);
		
		return {
			correct,
			total,
			percentage,
			passed: percentage >= 60
		};
	}
	
	function displayResults(results) {
		scorePercentage.textContent = `${results.percentage}%`;
		correctCount.textContent = results.correct;
		totalCount.textContent = results.total;
		
		// Update score circle color based on performance
		const scoreCircle = document.querySelector('.score-circle');
		scoreCircle.className = 'score-circle';
		if (results.percentage >= 80) {
			scoreCircle.classList.add('excellent');
		} else if (results.percentage >= 60) {
			scoreCircle.classList.add('good');
		} else {
			scoreCircle.classList.add('poor');
		}
	}
	
	function toggleReview() {
		reviewSection.classList.toggle('hidden');
		
		if (!reviewSection.classList.contains('hidden')) {
			renderReview();
		}
	}
	
	function renderReview() {
		let html = '';
		
		assessmentQuestions.forEach((question, index) => {
			const userAnswer = userAnswers[question.id];
			const isCorrect = userAnswer === question.correctIndex;
			
			html += `
				<div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
					<div class="review-header">
						<h4>Question ${index + 1}</h4>
						<span class="result-badge ${isCorrect ? 'correct' : 'incorrect'}">
							${isCorrect ? 'Correct' : 'Incorrect'}
						</span>
					</div>
					<div class="review-question">${escapeHtml(question.text)}</div>
					<div class="review-options">
						${question.options.map((option, oIndex) => {
							let className = 'option';
							if (oIndex === question.correctIndex) className += ' correct-answer';
							if (oIndex === userAnswer) className += ' user-answer';
							
							return `<div class="${className}">${String.fromCharCode(65 + oIndex)}. ${escapeHtml(option)}</div>`;
						}).join('')}
					</div>
				</div>
			`;
		});
		
		reviewContent.innerHTML = html;
	}
	
	function resetAssessment() {
		assessmentProgress.classList.add('hidden');
		resultsDisplay.classList.add('hidden');
		reviewSection.classList.add('hidden');
		assessmentSetup.classList.remove('hidden');
		
		// Reset state
		assessmentQuestions = [];
		currentQuestionIndex = 0;
		userAnswers = {};
		clearInterval(timerId);
		isPaused = false;
		assessmentStartTime = null;
		
		// Reset timer display
		timer.classList.remove('warning');
		pauseBtn.textContent = 'Pause';
	}
	
	// Utility Functions
	function shuffleArray(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
	
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
	
	function showNotification(message, type = 'info') {
		// Remove existing notifications
		const existing = document.querySelector('.notification');
		if (existing) existing.remove();
		
		const notification = document.createElement('div');
		notification.className = `notification notification-${type}`;
		notification.textContent = message;
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			padding: 12px 16px;
			border-radius: 8px;
			background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
			color: white;
			font-weight: 600;
			z-index: 1000;
			box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
			transform: translateX(100%);
			transition: transform 0.3s ease;
		`;
		
		document.body.appendChild(notification);
		
		// Animate in
		setTimeout(() => notification.style.transform = 'translateX(0)', 10);
		
		// Auto remove after 3 seconds
		setTimeout(() => {
			notification.style.transform = 'translateX(100%)';
			setTimeout(() => notification.remove(), 300);
		}, 3000);
	}
	
	function saveResults(results) {
		try {
			const existingResults = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
			existingResults.push(results);
			localStorage.setItem(RESULTS_KEY, JSON.stringify(existingResults));
		} catch (error) {
			console.error('Failed to save results:', error);
		}
	}
	
	// Make handleAnswerChange globally available for inline event handlers
	window.handleAnswerChange = handleAnswerChange;
})();
