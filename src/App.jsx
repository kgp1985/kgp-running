import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from './constants/routes.js'
import Navbar from './components/layout/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import RunningLog from './pages/RunningLog.jsx'
import TrainingPlan from './pages/TrainingPlan.jsx'
import RaceCalculator from './pages/RaceCalculator.jsx'
import WorkoutTypes from './pages/WorkoutTypes.jsx'
import Login from './pages/Login.jsx'
import CoachLog from './pages/CoachLog.jsx'
import Profile from './pages/Profile.jsx'
import Privacy from './pages/Privacy.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path={ROUTES.HOME}       element={<Home />} />
            <Route path={ROUTES.CALCULATOR} element={<RaceCalculator />} />
            <Route path={ROUTES.WORKOUTS}   element={<WorkoutTypes />} />
            <Route path={ROUTES.LOGIN}      element={<Login />} />
            <Route path={ROUTES.COACH_LOG}  element={<CoachLog />} />
            <Route
              path={ROUTES.LOG}
              element={
                <ProtectedRoute>
                  <RunningLog />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PLAN}
              element={
                <ProtectedRoute>
                  <TrainingPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PROFILE}
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path={ROUTES.PRIVACY} element={<Privacy />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
