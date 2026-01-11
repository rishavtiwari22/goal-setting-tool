import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmailFromJWT, isTokenValid } from "../utils/jwt";
import { getFirestoreInstance } from "../services/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Spinner } from "./ui/spinner";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        
        if (!isTokenValid(token)) {
          navigate("/");
          return;
        }

        const email = getEmailFromJWT(token);
        if (!email) {
          navigate("/");
          return;
        }

        const db = await getFirestoreInstance();
        if (!db) {
          navigate("/");
          return;
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          navigate("/");
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const role = userData.role;

        if (role !== "admin") {
          navigate("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking admin role:", error);
        navigate("/");
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminRole();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

