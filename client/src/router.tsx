import { createBrowserRouter, Navigate } from "react-router-dom";
import { AnalyzerPage } from "./pages/Analyzer";
import { AssessmentPage } from "./pages/Assessment";
import { CompaniesPage } from "./pages/Companies";
import { CompanyDetailPage } from "./pages/CompanyDetail";
import { DashboardPage } from "./pages/Dashboard";
import { ForumPage } from "./pages/Forum";
import { LandingPage } from "./pages/Landing";
import { LoginPage } from "./pages/Login";
import { MentorshipPage } from "./pages/Mentorship";
import { ProfilePage } from "./pages/Profile";
import { RegisterPage } from "./pages/Register";

export const appRouter = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/assessment", element: <AssessmentPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/companies", element: <CompaniesPage /> },
  { path: "/companies/:id", element: <CompanyDetailPage /> },
  { path: "/forum", element: <ForumPage /> },
  { path: "/mentorship", element: <MentorshipPage /> },
  { path: "/analyzer", element: <AnalyzerPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

