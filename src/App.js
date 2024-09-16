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
    task: "",
    elapsedTime: 0,
    isRunning: false,
    startTime: null,
  });
  const [timeInput, setTimeInput] = useState("0:00:00");
  const [isEditing, setIsEditing] = useState(false);
  const [editStartTime, setEditStartTime] = useState(null);
  const [editStartElapsedTime, setEditStartElapsedTime] = useState(0);
  const [wasRunningBeforeEdit, setWasRunningBeforeEdit] = useState(false);
  const intervalRef = useRef(null);
  const timerRef = ref(database, "timer");

  useEffect(() => {
    const unsubscribe = onValue(timerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const currentTime = Date.now();
        const elapsedTime =
          data.isRunning && data.startTime
            ? Math.floor((currentTime - data.startTime) / 1000) +
              data.elapsedTime
            : data.elapsedTime;

        if (!isEditing) {
          setTimeInput(formatTime(elapsedTime));
        }

        setTimer({
          task: data.task || "",
          elapsedTime,
          isRunning: data.isRunning || false,
          startTime: data.startTime || null,
        });
      }
    });

    return () => unsubscribe();
  }, [isEditing]);

  useEffect(() => {
    if (timer.isRunning && !isEditing) {
      intervalRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          const newElapsedTime = prevTimer.elapsedTime + 1;
          if (!isEditing) {
            setTimeInput(formatTime(newElapsedTime));
          }
          return { ...prevTimer, elapsedTime: newElapsedTime };
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [timer.isRunning, isEditing]);

  const formatTime = (totalSeconds) => {
    if (
      typeof totalSeconds !== "number" ||
      isNaN(totalSeconds) ||
      totalSeconds < 0
    ) {
      return "0:00:00";
    }

    totalSeconds = Math.floor(totalSeconds);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hoursStr = hours.toString();
    const minutesStr = minutes.toString().padStart(2, "0");
    const secondsStr = seconds.toString().padStart(2, "0");

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
  };

  const parseTime = (timeString) => {
    if (!timeString || timeString.trim() === "") {
      return 0;
    }

    const parts = timeString.split(":");
    let hours = 0,
      minutes = 0,
      seconds = 0;

    if (parts.length === 1) {
      minutes = parseInt(parts[0], 10) || 0;
      hours = Math.floor(minutes / 60);
      minutes = minutes % 60;
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10) || 0;
      seconds = parseInt(parts[1], 10) || 0;
    } else if (parts.length === 3) {
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      seconds = parseInt(parts[2], 10) || 0;
    }

    minutes += Math.floor(seconds / 60);
    seconds = seconds % 60;
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;

    return hours * 3600 + minutes * 60 + seconds;
  };

  const updateFirebase = (updates) => {
    const filteredUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    set(timerRef, filteredUpdates);
  };

  const toggleTimer = () => {
    const currentTime = Date.now();
    const newIsRunning = !timer.isRunning;

    updateFirebase({
      task: timer.task,
      isRunning: newIsRunning,
      startTime: newIsRunning ? currentTime : null,
      elapsedTime: timer.elapsedTime,
    });
  };

  const handleTaskChange = (e) => {
    const newTask = e.target.value;
    setTimer((prevTimer) => ({ ...prevTimer, task: newTask }));
    updateFirebase({ task: newTask });
  };

  const handleTimeChange = (e) => {
    const value = e.target.value;
    setTimeInput(value);
  };

  const handleTimeFocus = () => {
    setIsEditing(true);
    const currentTime = Date.now();
    setEditStartTime(currentTime);

    const timerRef = ref(database, "timer");
    get(timerRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const latestElapsedTime = data.isRunning
          ? Math.floor((currentTime - data.startTime) / 1000) + data.elapsedTime
          : data.elapsedTime;
        setEditStartElapsedTime(latestElapsedTime);
      }
    });

    setWasRunningBeforeEdit(timer.isRunning);
  };
  const handleTimeBlur = () => {
    setIsEditing(false);
    const currentTime = Date.now();
    const newInputSeconds = parseTime(timeInput);
    const timeElapsedSinceEdit = Math.floor(
      (currentTime - editStartTime) / 1000
    );

    let finalElapsedTime;
    if (wasRunningBeforeEdit) {
      if (newInputSeconds !== editStartElapsedTime) {
        finalElapsedTime = newInputSeconds + timeElapsedSinceEdit;
      } else {
        finalElapsedTime = editStartElapsedTime + timeElapsedSinceEdit;
      }
    } else {
      finalElapsedTime = newInputSeconds;
    }

    setTimeInput(formatTime(finalElapsedTime));

    setTimer((prevTimer) => ({
      ...prevTimer,
      elapsedTime: finalElapsedTime,
      isRunning: wasRunningBeforeEdit,
      startTime: wasRunningBeforeEdit ? currentTime : null,
    }));

    updateFirebase({
      elapsedTime: finalElapsedTime,
      isRunning: wasRunningBeforeEdit,
      startTime: wasRunningBeforeEdit ? currentTime : null,
    });
  };
  const resetTimer = () => {
    setTimeInput("0:00:00");
    setIsEditing(false);
    setWasRunningBeforeEdit(false);
    updateFirebase({
      task: timer.task,
      elapsedTime: 0,
      isRunning: false,
      startTime: null,
    });
  };

  return (
    <TimerContainer>
      <TaskInput
        type="text"
        value={timer.task}
        onChange={handleTaskChange}
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
