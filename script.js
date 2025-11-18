// Meal Tracker App
class MealTracker {
    constructor() {
        this.meals = this.loadMeals();
        this.currentPeriod = 30; // Default to 1 month
        this.init();
    }

    init() {
        // Set today's date as default
        document.getElementById('date').valueAsDate = new Date();

        // Add meal type change listener to show/hide fields
        document.getElementById('mealType').addEventListener('change', (e) => {
            this.handleMealTypeChange(e.target.value);
        });

        // Add form submit listener
        document.getElementById('mealForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMeal();
        });

        // Add filter listeners
        document.getElementById('filterDate').addEventListener('change', (e) => {
            this.filterDate = e.target.value;
            this.renderMealHistory();
        });

        document.getElementById('clearFilter').addEventListener('click', () => {
            document.getElementById('filterDate').value = '';
            this.filterDate = null;
            this.renderMealHistory();
        });

        // Add export/import listeners
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        document.getElementById('mergeData').addEventListener('click', () => {
            this.importData('merge');
        });

        document.getElementById('replaceData').addEventListener('click', () => {
            this.importData('replace');
        });

        document.getElementById('cancelImport').addEventListener('click', () => {
            this.cancelImport();
        });

        // Add time period control listeners
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = parseInt(e.currentTarget.dataset.period);
                this.currentPeriod = period;

                // Update active state
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Re-render the graph
                this.renderDailyGraph();
            });
        });

        // Render everything
        this.renderDailyGraph();
        this.renderDetailedGraph();
        this.renderMealHistory();
    }

    handleMealTypeChange(mealType) {
        const locationGroup = document.getElementById('locationGroup');
        const healthinessGroup = document.getElementById('healthinessGroup');
        const locationSelect = document.getElementById('location');
        const healthinessSelect = document.getElementById('healthiness');

        if (mealType === 'skipped') {
            locationGroup.style.display = 'none';
            healthinessGroup.style.display = 'none';
            locationSelect.removeAttribute('required');
            healthinessSelect.removeAttribute('required');
        } else {
            locationGroup.style.display = 'block';
            healthinessGroup.style.display = 'block';
            locationSelect.setAttribute('required', 'required');
            healthinessSelect.setAttribute('required', 'required');
        }
    }

    loadMeals() {
        const stored = localStorage.getItem('mealsV2');
        if (stored) {
            return JSON.parse(stored);
        }

        // Migrate old data if exists
        const oldStored = localStorage.getItem('meals');
        if (oldStored) {
            const oldMeals = JSON.parse(oldStored);
            const newMeals = {};

            // Convert old format to new format (assume it was lunch)
            for (const [date, meal] of Object.entries(oldMeals)) {
                newMeals[date] = {
                    lunch: meal
                };
            }

            this.saveMeals(newMeals);
            return newMeals;
        }

        return {};
    }

    saveMeals(meals = null) {
        const toSave = meals || this.meals;
        localStorage.setItem('mealsV2', JSON.stringify(toSave));
    }

    addMeal() {
        const date = document.getElementById('date').value;
        const mealType = document.getElementById('mealType').value;
        const location = document.getElementById('location').value;
        const healthiness = document.getElementById('healthiness').value;
        const notes = document.getElementById('notes').value;

        // Initialize date entry if it doesn't exist
        if (!this.meals[date]) {
            this.meals[date] = {};
        }

        if (mealType === 'skipped') {
            this.meals[date][mealType] = {
                skipped: true,
                notes,
                timestamp: new Date().toISOString()
            };
        } else {
            this.meals[date][mealType] = {
                location,
                healthiness,
                notes,
                timestamp: new Date().toISOString()
            };
        }

        this.saveMeals();
        this.renderDailyGraph();
        this.renderDetailedGraph();
        this.renderMealHistory();

        // Reset form
        document.getElementById('mealForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        this.handleMealTypeChange('');

        alert('Meal logged successfully!');
    }

    editMeal(date, mealType) {
        const meal = this.meals[date][mealType];

        // Populate the form with existing data
        document.getElementById('date').value = date;
        document.getElementById('mealType').value = mealType;

        if (meal.skipped) {
            this.handleMealTypeChange('skipped');
        } else {
            this.handleMealTypeChange(mealType);
            document.getElementById('location').value = meal.location;
            document.getElementById('healthiness').value = meal.healthiness;
        }

        document.getElementById('notes').value = meal.notes || '';

        // Scroll to form
        document.querySelector('.add-meal').scrollIntoView({ behavior: 'smooth' });

        // Delete the old entry (it will be re-added when form is submitted)
        this.deleteMeal(date, mealType, true);
    }

    deleteMeal(date, mealType, skipConfirm = false) {
        if (!skipConfirm && !confirm(`Are you sure you want to delete this ${mealType} entry?`)) {
            return;
        }

        if (this.meals[date]) {
            delete this.meals[date][mealType];

            // If no more meals for this date, delete the date entry
            if (Object.keys(this.meals[date]).length === 0) {
                delete this.meals[date];
            }

            this.saveMeals();
            this.renderDailyGraph();
            this.renderDetailedGraph();
            this.renderMealHistory();

            if (!skipConfirm) {
                alert('Meal deleted successfully!');
            }
        }
    }

    renderMealHistory() {
        const historyList = document.getElementById('mealHistoryList');
        historyList.innerHTML = '';

        // Get all meals and sort by date (most recent first)
        const allMeals = [];
        for (const [date, dayMeals] of Object.entries(this.meals)) {
            for (const [mealType, meal] of Object.entries(dayMeals)) {
                allMeals.push({
                    date,
                    mealType,
                    meal
                });
            }
        }

        // Sort by date descending, then by meal type
        const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, skipped: 3 };
        allMeals.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return mealOrder[a.mealType] - mealOrder[b.mealType];
        });

        // Filter if date filter is active
        let filteredMeals = allMeals;
        if (this.filterDate) {
            filteredMeals = allMeals.filter(m => m.date === this.filterDate);
        }

        // Update total count
        document.getElementById('totalMeals').textContent = `Total meals logged: ${allMeals.length}`;

        if (filteredMeals.length === 0) {
            historyList.innerHTML = '<div class="no-meals">No meals logged yet. Start by logging your first meal above!</div>';
            return;
        }

        // Group by date
        let currentDate = null;
        let dateGroup = null;

        filteredMeals.forEach(({ date, mealType, meal }) => {
            // Create date header if new date
            if (date !== currentDate) {
                currentDate = date;
                dateGroup = document.createElement('div');
                dateGroup.className = 'date-group';

                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                const dateObj = new Date(date + 'T00:00:00');
                dateHeader.textContent = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                dateGroup.appendChild(dateHeader);
                historyList.appendChild(dateGroup);
            }

            // Create meal entry
            const mealEntry = document.createElement('div');
            mealEntry.className = 'meal-entry';

            const mealClass = this.getMealClass(meal);
            mealEntry.classList.add(mealClass);

            const mealInfo = document.createElement('div');
            mealInfo.className = 'meal-info';

            const mealTypeLabel = document.createElement('div');
            mealTypeLabel.className = 'meal-type';
            mealTypeLabel.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);

            const mealDetails = document.createElement('div');
            mealDetails.className = 'meal-details';

            if (meal.skipped) {
                mealDetails.textContent = 'Skipped';
            } else {
                mealDetails.innerHTML = `
                    <span class="location">${meal.location.charAt(0).toUpperCase() + meal.location.slice(1)}</span>
                    <span class="separator">•</span>
                    <span class="healthiness">${meal.healthiness.charAt(0).toUpperCase() + meal.healthiness.slice(1)}</span>
                `;
            }

            if (meal.notes) {
                const notes = document.createElement('div');
                notes.className = 'meal-notes';
                notes.textContent = meal.notes;
                mealDetails.appendChild(notes);
            }

            mealInfo.appendChild(mealTypeLabel);
            mealInfo.appendChild(mealDetails);

            const mealActions = document.createElement('div');
            mealActions.className = 'meal-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Edit meal';
            editBtn.onclick = () => this.editMeal(date, mealType);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Delete meal';
            deleteBtn.onclick = () => this.deleteMeal(date, mealType);

            mealActions.appendChild(editBtn);
            mealActions.appendChild(deleteBtn);

            mealEntry.appendChild(mealInfo);
            mealEntry.appendChild(mealActions);

            dateGroup.appendChild(mealEntry);
        });
    }

    getMealClass(meal) {
        if (!meal) return 'no-data';
        if (meal.skipped) return 'meal-skipped';

        const { location, healthiness } = meal;
        if (location === 'home' && healthiness === 'healthy') return 'home-healthy';
        if (location === 'home' && healthiness === 'unhealthy') return 'home-unhealthy';
        if (location === 'outside' && healthiness === 'healthy') return 'outside-healthy';
        if (location === 'outside' && healthiness === 'unhealthy') return 'outside-unhealthy';
        return 'no-data';
    }

    getDailyClass(dayMeals) {
        if (!dayMeals || Object.keys(dayMeals).length === 0) return 'no-data';

        // Check if all logged meals are skipped
        const meals = Object.values(dayMeals);
        const allSkipped = meals.every(m => m && m.skipped);
        if (allSkipped) return 'meal-skipped';

        // Get the best meal of the day (prioritize healthy home meals)
        const scores = {
            'home-healthy': 4,
            'outside-healthy': 3,
            'home-unhealthy': 2,
            'outside-unhealthy': 1,
            'meal-skipped': 0
        };

        let bestClass = 'no-data';
        let bestScore = -1;

        for (const meal of meals) {
            if (meal && !meal.skipped) {
                const mealClass = this.getMealClass(meal);
                const score = scores[mealClass] || 0;
                if (score > bestScore) {
                    bestScore = score;
                    bestClass = mealClass;
                }
            }
        }

        return bestClass;
    }

    renderDailyGraph() {
        const graphContainer = document.getElementById('dailyGraph');
        graphContainer.innerHTML = '';

        // Calculate date range based on current period
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (this.currentPeriod - 1)); // Including today

        this.renderContributionGrid(graphContainer, startDate, endDate, (date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = this.meals[dateStr];
            return this.getDailyClass(dayMeals);
        }, (date) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayMeals = this.meals[dateStr];

            let tooltip = date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) + '\n';

            if (dayMeals) {
                const mealTypes = ['breakfast', 'lunch', 'dinner'];
                const logged = [];

                mealTypes.forEach(type => {
                    if (dayMeals[type]) {
                        if (dayMeals[type].skipped) {
                            logged.push(`${type}: Skipped`);
                        } else {
                            logged.push(`${type}: ${dayMeals[type].location} - ${dayMeals[type].healthiness}`);
                        }
                    }
                });

                if (dayMeals.skipped) {
                    logged.push('Meal Skipped');
                }

                tooltip += logged.length > 0 ? logged.join('\n') : 'No meals logged';
            } else {
                tooltip += 'No meals logged';
            }

            return tooltip;
        });
    }

    renderDetailedGraph() {
        const graphContainer = document.getElementById('detailedGraph');
        graphContainer.innerHTML = '';

        // Calculate date range (last 90 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 89); // 90 days including today

        // Create grid structure
        const weeks = this.generateWeeks(startDate, endDate);

        // Reverse weeks array to show newest on the left
        const reversedWeeks = weeks.reverse();

        // Create month labels
        const monthLabels = document.createElement('div');
        monthLabels.className = 'month-labels';

        let lastMonth = -1;
        reversedWeeks.forEach((week, weekIndex) => {
            const firstDay = week.find(day => day !== null);
            if (firstDay) {
                const month = firstDay.getMonth();
                if (month !== lastMonth && weekIndex > 0) {
                    const label = document.createElement('span');
                    label.textContent = firstDay.toLocaleDateString('en-US', { month: 'short' });
                    label.style.left = `${weekIndex * 44}px`;
                    monthLabels.appendChild(label);
                    lastMonth = month;
                }
            }
        });
        graphContainer.appendChild(monthLabels);

        // Create meal type labels
        const mealLabels = document.createElement('div');
        mealLabels.className = 'meal-labels';
        const meals = ['B', 'L', 'D'];
        meals.forEach((meal, index) => {
            const label = document.createElement('span');
            label.textContent = meal;
            label.style.top = `${index * 14}px`;
            mealLabels.appendChild(label);
        });
        graphContainer.appendChild(mealLabels);

        // Create the grid
        const grid = document.createElement('div');
        grid.className = 'contribution-grid detailed';

        reversedWeeks.forEach(week => {
            const weekColumn = document.createElement('div');
            weekColumn.className = 'week-column-detailed';

            week.forEach(date => {
                const dayContainer = document.createElement('div');
                dayContainer.className = 'day-container';

                if (date) {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayMeals = this.meals[dateStr] || {};

                    // Create squares for breakfast, lunch, dinner
                    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
                        const mealSquare = document.createElement('div');
                        mealSquare.className = 'meal-square';

                        const meal = dayMeals[mealType];
                        const mealClass = this.getMealClass(meal);
                        mealSquare.classList.add(mealClass);

                        // Add tooltip
                        let tooltip = `${date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })} - ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}\n`;

                        if (meal) {
                            if (meal.skipped) {
                                tooltip += 'Skipped';
                            } else {
                                tooltip += `${meal.location} - ${meal.healthiness}`;
                                if (meal.notes) tooltip += `\n${meal.notes}`;
                            }
                        } else {
                            tooltip += 'Not logged';
                        }

                        mealSquare.title = tooltip;
                        dayContainer.appendChild(mealSquare);
                    });
                } else {
                    // Empty day (padding)
                    for (let i = 0; i < 3; i++) {
                        const emptySquare = document.createElement('div');
                        emptySquare.className = 'meal-square empty';
                        dayContainer.appendChild(emptySquare);
                    }
                }

                weekColumn.appendChild(dayContainer);
            });

            grid.appendChild(weekColumn);
        });

        graphContainer.appendChild(grid);
    }

    generateWeeks(startDate, endDate) {
        const weeks = [];
        let currentWeek = [];
        let currentDate = new Date(startDate);

        // Pad the beginning to start on Sunday
        const startDay = currentDate.getDay();
        for (let i = 0; i < startDay; i++) {
            currentWeek.push(null);
        }

        // Generate all dates
        while (currentDate <= endDate) {
            currentWeek.push(new Date(currentDate));

            if (currentDate.getDay() === 6) { // Saturday
                weeks.push(currentWeek);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add remaining days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }

    renderContributionGrid(container, startDate, endDate, getClassFn, getTooltipFn) {
        const weeks = this.generateWeeks(startDate, endDate);

        // Reverse weeks array to show newest on the left
        const reversedWeeks = weeks.reverse();

        // Create month labels
        const monthLabels = document.createElement('div');
        monthLabels.className = 'month-labels';

        let lastMonth = -1;
        reversedWeeks.forEach((week, weekIndex) => {
            const firstDay = week.find(day => day !== null);
            if (firstDay) {
                const month = firstDay.getMonth();
                if (month !== lastMonth && weekIndex > 0) {
                    const label = document.createElement('span');
                    label.textContent = firstDay.toLocaleDateString('en-US', { month: 'short' });
                    label.style.left = `${weekIndex * 14}px`;
                    monthLabels.appendChild(label);
                    lastMonth = month;
                }
            }
        });
        container.appendChild(monthLabels);

        // Create day labels
        const dayLabels = document.createElement('div');
        dayLabels.className = 'day-labels';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach((day, index) => {
            if (index % 2 === 1) { // Only show Mon, Wed, Fri
                const label = document.createElement('span');
                label.textContent = day;
                label.style.top = `${index * 14}px`;
                dayLabels.appendChild(label);
            }
        });
        container.appendChild(dayLabels);

        // Create the grid
        const grid = document.createElement('div');
        grid.className = 'contribution-grid';

        reversedWeeks.forEach(week => {
            const weekColumn = document.createElement('div');
            weekColumn.className = 'week-column';

            week.forEach(date => {
                const daySquare = document.createElement('div');
                daySquare.className = 'day-square';

                if (date) {
                    const mealClass = getClassFn(date);
                    daySquare.classList.add(mealClass);
                    daySquare.title = getTooltipFn(date);
                } else {
                    daySquare.classList.add('empty');
                }

                weekColumn.appendChild(daySquare);
            });

            grid.appendChild(weekColumn);
        });

        container.appendChild(grid);
    }

    exportData() {
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            meals: this.meals
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `meal-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert('Data exported successfully!');
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // Validate the data structure
                if (!importedData.meals || typeof importedData.meals !== 'object') {
                    throw new Error('Invalid data format');
                }

                // Store the imported data temporarily
                this.pendingImport = importedData.meals;

                // Show import options
                document.getElementById('importOptions').style.display = 'block';

            } catch (error) {
                alert('Error reading file: Invalid file format. Please select a valid meal tracker backup file.');
                console.error('Import error:', error);
            }
        };

        reader.onerror = () => {
            alert('Error reading file. Please try again.');
        };

        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    }

    importData(mode) {
        if (!this.pendingImport) {
            alert('No data to import. Please select a file first.');
            return;
        }

        if (mode === 'replace') {
            if (!confirm('This will REPLACE all your existing data. Are you sure?')) {
                return;
            }
            this.meals = this.pendingImport;
        } else if (mode === 'merge') {
            // Merge imported data with existing data
            // Imported data takes precedence for conflicts
            for (const [date, dayMeals] of Object.entries(this.pendingImport)) {
                if (!this.meals[date]) {
                    this.meals[date] = {};
                }

                for (const [mealType, meal] of Object.entries(dayMeals)) {
                    this.meals[date][mealType] = meal;
                }
            }
        }

        this.saveMeals();
        this.renderDailyGraph();
        this.renderDetailedGraph();
        this.renderMealHistory();

        // Hide import options
        document.getElementById('importOptions').style.display = 'none';
        this.pendingImport = null;

        alert(`Data imported successfully using ${mode} mode!`);
    }

    cancelImport() {
        this.pendingImport = null;
        document.getElementById('importOptions').style.display = 'none';
        document.getElementById('importFile').value = '';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MealTracker();
});
