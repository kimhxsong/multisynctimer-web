import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, X } from "lucide-react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";
import styled from "@emotion/styled";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #1e1e1e;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  gap: 0.5rem;
  width: 100%;
  max-width: 600px;
`;

const TaskInput = styled.input`
  background-color: transparent;
  border: none;
  color: #a0a0a0;
  flex-grow: 1;
  font-size: 1rem;
  &:focus {
    outline: none;
  }
`;

const TimeInput = styled.input`
  background-color: #2c2c2c;
  border: none;
  color: white;
  font-size: 1.25rem;
  font-weight: bold;
  width: 7ch;
  text-align: center;
  border-radius: 4px;
  &:focus {
    outline: none;
    background-color: #3c3c3c;
  }
`;

const Button = styled.button`
  background-color: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 50%;
  color: white;
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const PlayPauseButton = styled(Button)`
  background-color: ${(props) => (props.isRunning ? "#f87171" : "#10b981")};
  &:hover {
    background-color: ${(props) => (props.isRunning ? "#ef4444" : "#059669")};
  }
`;

const TimerComponent = () => {
  const [timer, setTimer] = useState({
    description: "",
    isRunning: false,
    startTime: null,
    lastPausedTime: null,
    pausedElapsedInterval: 0,
  });
  const [timeInput, setTimeInput] = useState("0:00:00");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedTime, setFocusedTime] = useState(null);
  const intervalRef = useRef(null);
  const timerRef = ref(database, "timer");

  useEffect(() => {
    const unsubscribe = onValue(timerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentTime = Date.now();
        const elapsedTime = calculateElapsedTime(data, currentTime);

        if (!isEditing) {
          setTimeInput(formatTime(elapsedTime));
        }

        setTimer({
          description: data.description || "",
          isRunning: data.isRunning || false,
          startTime: data.startTime || null,
          lastPausedTime: data.lastPausedTime || null,
          pausedElapsedInterval: data.pausedElapsedInterval || 0,
        });
      } else {
        // If no data in database, initialize with default values
        const defaultState = {
          description: "",
          isRunning: false,
          startTime: null,
          lastPausedTime: null,
          pausedElapsedInterval: 0,
        };
        setTimer(defaultState);
        updateFirebase(defaultState);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isEditing]);

  useEffect(() => {
    if (timer.isRunning && !isEditing) {
      intervalRef.current = setInterval(() => {
        const elapsedTime = calculateElapsedTime(timer, Date.now());
        setTimeInput(formatTime(elapsedTime));
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [
    timer.isRunning,
    isEditing,
    timer.startTime,
    timer.pausedElapsedInterval,
  ]);

  const calculateElapsedTime = (timerData, currentTime) => {
    if (timerData.isRunning && timerData.startTime) {
      return Math.floor(
        (currentTime - timerData.startTime - timerData.pausedElapsedInterval) /
          1000
      );
    }
    if (timerData.startTime && timerData.lastPausedTime) {
      return Math.floor(
        (timerData.lastPausedTime -
          timerData.startTime -
          timerData.pausedElapsedInterval) /
          1000
      );
    }
    return 0;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) {
      return "0:00:00";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const parseTime = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setTimer((prevTimer) => ({ ...prevTimer, description: newDescription }));
    updateFirebase({ description: newDescription });
  };

  const handleTimeChange = (e) => {
    setTimeInput(e.target.value);
  };

  const handleTimeFocus = () => {
    setFocusedTime(timeInput);
    setIsEditing(true);
  };

  const handleTimeBlur = () => {
    const prevTimeInput = focusedTime;
    setFocusedTime(null);
    setIsEditing(false);

    const newInputSeconds = parseTime(timeInput);
    const currentTime = Date.now();
    const currentElapsedTime = calculateElapsedTime(timer, currentTime);

    if (timeInput !== prevTimeInput) {
      let newStartTime, newPausedElapsedInterval;

      if (timer.isRunning) {
        newStartTime = currentTime - newInputSeconds * 1000;
        newPausedElapsedInterval = timer.pausedElapsedInterval;
      } else {
        newStartTime = null;
        newPausedElapsedInterval = timer.pausedElapsedInterval;
      }

      setTimer((prevTimer) => ({
        ...prevTimer,
        startTime: newStartTime,
        pausedElapsedInterval: newPausedElapsedInterval,
      }));

      updateFirebase({
        startTime: newStartTime,
        pausedElapsedInterval: newPausedElapsedInterval,
      });
    } else {
      setTimeInput(formatTime(currentElapsedTime));
    }
  };

  const toggleTimer = async () => {
    const currentTime = Date.now();
    let newTimerState;

    if (timer.isRunning) {
      // Pausing the timer
      const snapshot = await get(timerRef);
      const dbTimer = snapshot.val();

      if (
        dbTimer &&
        dbTimer.lastPausedTime &&
        dbTimer.lastPausedTime > currentTime
      ) {
        // Another device has paused more recently, don't update
        return;
      }

      newTimerState = {
        ...timer,
        isRunning: false,
        lastPausedTime: currentTime,
      };
    } else {
      // Starting the timer
      const additionalPausedInterval = timer.lastPausedTime
        ? currentTime - timer.lastPausedTime
        : 0;
      newTimerState = {
        ...timer,
        isRunning: true,
        startTime: timer.startTime || currentTime,
        lastPausedTime: null,
        pausedElapsedInterval:
          timer.pausedElapsedInterval + additionalPausedInterval,
      };
    }

    setTimer(newTimerState);
    updateFirebase(newTimerState);
  };

  const resetTimer = () => {
    const resetState = {
      description: "",
      isRunning: false,
      startTime: null,
      lastPausedTime: null,
      pausedElapsedInterval: 0,
    };
    setTimer(resetState);
    setTimeInput("0:00:00");
    setIsEditing(false);
    updateFirebase(resetState);
  };

  const updateFirebase = async (updates) => {
    const snapshot = await get(timerRef);
    const dbTimer = snapshot.val() || {};

    // If we're updating lastPausedTime, only update if our time is more recent
    if (
      updates.lastPausedTime &&
      dbTimer.lastPausedTime &&
      dbTimer.lastPausedTime > updates.lastPausedTime
    ) {
      delete updates.lastPausedTime;
    }

    set(timerRef, { ...dbTimer, ...updates });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <TimerContainer>
      <TaskInput
        type="text"
        value={timer.description}
        onChange={handleDescriptionChange}
        placeholder="What are you working on?"
      />
      <TimeInput
        value={timeInput}
        onChange={handleTimeChange}
        onFocus={handleTimeFocus}
        onBlur={handleTimeBlur}
      />
      <PlayPauseButton onClick={toggleTimer} isRunning={timer.isRunning}>
        {timer.isRunning ? <Pause size={24} /> : <Play size={24} />}
      </PlayPauseButton>
      <Button onClick={resetTimer}>
        <X size={24} color="white" />
      </Button>
    </TimerContainer>
  );
};

export default TimerComponent;
