// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import './App.css'
import { Routes, Route, Navigate } from "react-router"
import AppLayout from "@/components/ui/AppLayout"
import Workouts from "@/features/workouts/WorkoutsPage"
import SplitsPage from "@/features/splits/SplitsPage"
import SplitSchedulePage from "@/features/splits/SplitSchedulePage"
import DayProgramPage from "@/features/splits/DayProgramPage"
import AddWorkoutPage from "@/features/splits/AddWorkoutPage"
import SplitDetailPage from "@/features/splits/SplitDetailPage"
import HomePage from "@/features/session/HomePage"
import ProfilePage from "@/features/profile/ProfilePage"
import ProgressPage from "@/features/progress/ProgressPage"
import WorkoutProgressPage from "@/features/progress/WorkoutProgressPage"


export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/progress" element={<ProgressPage />} />
        <Route path="profile/progress/:id" element={<WorkoutProgressPage />} />
        <Route path="program" element={<SplitsPage />} />
        <Route path="program/schedule" element={<SplitSchedulePage />} />
        <Route path="program/schedule/day/:dow" element={<DayProgramPage />} />
        <Route path="program/schedule/day/:dow/add" element={<AddWorkoutPage />} />
        <Route path="program/:id" element={<SplitDetailPage />} />
        <Route path="workouts" element={<Workouts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
