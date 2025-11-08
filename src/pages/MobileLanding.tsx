import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLandingComponent from "@/components/MobileLanding";

const MobileLanding: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Detect if user is on desktop, redirect back
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (!isMobile) {
      navigate('/');
    }
  }, [navigate]);

  return <MobileLandingComponent />;
};

export default MobileLanding;
