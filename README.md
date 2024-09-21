# MultySyncTimer-web

This project is a web-based timer application using React and Firebase.

## Project Overview

MultySyncTimer-web is a real-time synchronized timer application built with React and Firebase. The application allows users to track time with high precision and synchronizes the timer across multiple devices using Firebase. It's designed for use in scenarios where accurate timing and synchronization are critical, such as online events, shared workspaces, or study sessions.

## Demo Video
1.	Browser Synchronization Test: This demo shows a synchronization test between two browser instances running MultySyncTimer-web. The video demonstrates real-time timer updates across both browsers, highlighting the application’s ability to maintain precise timing between multiple clients using Firebase.
 
![Screen Recording 2024-09-21 at 17 51 35](https://github.com/user-attachments/assets/19373bff-15d6-42a6-9427-fc4b9be8b558)

2.	iOS and watchOS Synchronization Test: This demo features a synchronization test between multiSyncTimer-ios-watchos (private repository) and the MultySyncTimer-web app. The video demonstrates the seamless interaction and real-time synchronization between mobile (iOS and watchOS) and web platforms, emphasizing the accuracy and consistency of the timer across different devices.
 
![Screen Recording 2024-09-22 at 05 34 13](https://github.com/user-attachments/assets/75d1056a-3451-40e9-9a99-6a97f432fcf3)

## Setup

Follow these steps to set up and run the project:

1. **Firebase Setup**
    - Go to the [Firebase Console](https://console.firebase.google.com/)
    - Create a new project or select an existing one
    - In the project settings, add a new web app
    - Copy the Firebase configuration object
2. **Environment Variables**
    - In the project root, you'll find a file named `env.template`
    - Copy this file and rename it to `.env`
    - Replace the placeholder values with your Firebase configuration:
        
        ```
        REACT_APP_FIREBASE_API_KEY=your_api_key
        REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
        REACT_APP_FIREBASE_PROJECT_ID=your_project_id
        REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        REACT_APP_FIREBASE_APP_ID=your_app_id
        ```
        
3. **Install Dependencies**
Run the following command in the project root:
    
    ```bash
    npm install
    ```
    
4. **Start the Application**
After the installation is complete, start the app with:
    
    ```bash
    npm run start
    ```
    
    The application should now be running on `http://localhost:3000`.
    

## Key Features

### Dynamic Interval Adjustment

The application dynamically adjusts the timer's update interval based on the current time. Instead of using a fixed `setTimeout` interval, this approach ensures that the updates happen as close to every second as possible, reducing drift and maintaining accuracy.

### Milliseconds Check

To improve precision, the application checks the milliseconds portion of the current time and adjusts the interval accordingly. If the milliseconds portion is less than 50ms, the interval is reset to 999ms. This fine-tuning helps keep the timer accurate and responsive, especially for real-time synchronization across multiple devices.

### Sub-second Precision

The timer is designed to maintain sub-50ms precision by dynamically adjusting its update intervals. This allows the application to stay accurate over long periods of usage, even when network or system performance may cause slight delays.

## Why just using `setTimeout` is not enough

Using setTimeout for timing intervals is common in JavaScript, but it doesn’t guarantee precise execution timing. Factors such as the event loop being blocked by other tasks can introduce delays, making setTimeout unsuitable for real-time applications like timers.

In this application, achieving high accuracy is crucial, particularly with sub-second precision. To address this, instead of relying solely on setTimeout, the timer dynamically adjusts its update interval to compensate for any potential delays.

Here’s how this is implemented in the code:
```javascript
const updateTimerDisplay = useCallback(() => {
  const now = Date.now();
  const elapsedTime = calculateElapsedTime(timer, now);
  setTimeInput(formatTime(elapsedTime));
}, [timer, calculateElapsedTime, formatTime]);

useEffect(() => {
  let timeoutId;

  const updateTimer = () => {
    if (timer.isRunning && !isEditing) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      const milliseconds = now % 1000;

      // Adjust the update interval based on how close to the next second we are
      if (timeSinceLastUpdate >= 1000 || milliseconds < 50) {
        updateTimerDisplay();
        lastUpdateTimeRef.current = now;

        if (milliseconds < 50) {
          timeoutId = setTimeout(updateTimer, 999); // Reset interval for precision
        } else {
          const nextUpdateInterval = 1000 - milliseconds;
          timeoutId = setTimeout(updateTimer, nextUpdateInterval);
        }
      } else {
        timeoutId = setTimeout(updateTimer, 999); // Default update interval
      }
    }
  };

  if (timer.isRunning && !isEditing) {
    updateTimer();
  }

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}, [timer, timer.isRunning, isEditing, updateTimerDisplay]);
```
## Contributing

This project is not open for public contributions. If you have any questions or feedback, please contact the project owner directly.

## License

This project is licensed under the MIT License.
