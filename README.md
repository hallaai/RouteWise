# 🗺️ RouteWise Scheduler

RouteWise Scheduler is an intelligent, web-based application designed to streamline field service management. It provides a powerful platform for optimally assigning tasks to workers (targets), generating efficient daily schedules, and visualizing routes on an interactive map.

The application takes into account numerous constraints such as worker skills, availability, working hours, task priorities, and location to create optimized schedules that minimize travel time and maximize productivity.

## ✨ Key Features

-   **🎯 Task and Target Management:** Easily load operational data. Upload tasks and workers from a JSON file or manage them directly through the user interface.
-   **⚙️ Dynamic Schedule Generation:** With a single click, generate a comprehensive, multi-day schedule. The system assigns tasks to the most suitable targets based on skills, availability, and location.
-   **🚗 Intelligent Route Optimization:** The scheduling algorithm minimizes travel time by sequencing tasks in a geographically logical order, calculating travel durations based on a configurable vehicle speed.
-   **📊 Comprehensive Reporting:** A dedicated "Report" tab provides a detailed breakdown of the generated schedule, including:
    -   An **Overall Summary** with total tasks, distance, and a pie chart visualizing the distribution of time between tasks, travel, and idle periods.
    -   A **Daily Breakdown** of key performance metrics.
    -   A **Breakdown by Target** to analyze individual worker efficiency.
-   **🗓️ Interactive Schedule View:** Visualize the entire schedule on a dynamic timeline. Each target's day is displayed as a horizontal bar, with colored blocks representing tasks and travel time.
-   **📍 Interactive Map View:** See all task locations plotted on an interactive map, with clustering for easy navigation. Filter tasks to see all, scheduled, or unscheduled items.
-   **🔧 Customizable Settings:** Fine-tune the scheduling engine's parameters, such as vehicle speed, travel time considerations, and working day extensions.

## 🛠️ How It Works

### The Route Optimization Algorithm

The core of the application is its scheduling and routing engine. While the current version uses a fast and effective **greedy algorithm**, it is designed to be extendable with more advanced AI-powered optimizers using Genkit.

Here is how the current process works:

1.  **Data Ingestion:** The user selects a date range and a set of tasks and targets to be scheduled.
2.  **Task Expansion:** The system identifies all occurrences of tasks within the selected date range, accounting for recurring tasks (e.g., weekly maintenance).
3.  **Daily Scheduling Loop:** For each day in the range, the engine iterates through the available targets.
4.  **Greedy Task Assignment:** For each target, the algorithm greedily selects the best available task from the pool of unscheduled tasks for that day. The selection process considers:
    -   **Skill Matching:** It only considers tasks for which the target possesses the required skills.
    -   **Time Windows:** It respects any start/end time constraints on a task.
    -   **Proximity:** It sorts remaining tasks by name (as a simple heuristic) and picks the first one that fits.
5... **Time Calculation:** The engine calculates the travel time from the target's last known location (either their home base or the previous task) to the new task.
6.  **Schedule Validation:** A task is only added to a target's schedule if it can be completed within their working hours (including any configured extensions).
7.  **Iteration:** This process repeats until all possible tasks for the day are scheduled or no more tasks can fit into any target's schedule.

### Unscheduled Task Handling

If some tasks cannot be scheduled within the standard working day, the application prompts the user with the option to automatically extend the working day and re-run the simulation to fit the remaining tasks.

## 📋 Task & Target Parameters

To achieve optimal results, the application considers a rich set of parameters for both tasks and targets.

### Task Properties
-   **Location**: The geographical coordinates (`lat`, `lng`) of the task.
-   **Duration**: The time in minutes required to complete the task.
-   **Time Window**: Optional `startTime` and `endTime` that define when the task must be performed.
-   **Skills**: A list of required skills to perform the task (e.g., `hygieniapassi`).
-   **Recurrence**: An optional `repeatInterval` (in days) for tasks that need to be done periodically.
-   **Segment**: A category or type for the task (e.g., "Toimiston siivous", "Kotisiivous").

### Target (Worker) Properties
-   **Home Location**: The starting and ending coordinates for the target's workday.
-   **Skills**: A list of skills the target possesses.
-   **Work Schedule**: The target's standard working hours (e.g., `08:00` to `16:00`).

## 🧪 Using the Test Data

The project includes a comprehensive test data file, `cleaning_demo_time_shifted.json`, to allow you to immediately see the application's features in action.

1.  **Load the Data:** On the main "Setup" screen, click the **"Upload JSON"** button and select the `cleaning_demo_time_shifted.json` file from the project's root directory.
2.  **Set the Date Range:** The tasks in this file are scheduled for the week of **September 22nd, 2025**. To see them, click the date range picker in the header and select a range that includes this week (e.g., Sep 22, 2025 to Sep 26, 2025).
3.  **Generate the Schedule:** Ensure that tasks and targets are selected in the two main panels, then click the **"Generate Schedule"** button.

You can now explore the generated timeline in the "Schedule" tab, view routes on the "Map," and analyze the efficiency in the "Report" tab.
