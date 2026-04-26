import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Problem = lazy(() => import("./pages/Problem"));
const Review = lazy(() => import("./pages/Review"));
const Interview = lazy(() => import("./pages/Interview"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

const Loader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
  </div>
);

const wrap = (Component: React.ComponentType) => (
  <Suspense fallback={<Loader />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  { path: "/", element: wrap(Landing) },
  { path: "/auth", element: wrap(Auth) },
  { path: "/onboarding", element: wrap(Onboarding) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/dashboard", element: wrap(Dashboard) },
          { path: "/roadmap", element: wrap(Roadmap) },
          { path: "/problem/:slug", element: wrap(Problem) },
          { path: "/review", element: wrap(Review) },
          { path: "/interview", element: wrap(Interview) },
          { path: "/profile", element: wrap(Profile) },
          { path: "/leaderboard", element: wrap(Leaderboard) },
        ],
      },
    ],
  },
]);
