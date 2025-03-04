import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";
import { useNavigate } from 'react-router-dom';
import { BarChart3, MessageSquare, CheckCircle2, Clock } from 'lucide-react';

// Remove these imports as we won't need default markers
// import markerIcon from 'leaflet/dist/images/marker-icon.png';
// import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// import markerShadow from 'leaflet/dist/leaflet/images/marker-shadow.png';

// Remove default icon configuration
// const defaultIcon = L.icon({...});
// L.Marker.prototype.options.icon = defaultIcon;

// Update createMarkerIcon function
const createMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="marker-pin" style="
        background-color: ${color};
        width: 18px;                    /* Reduced from 24px */
        height: 18px;                   /* Reduced from 24px */
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 3px rgba(0,0,0,0.3), 
                    0 2px 3px rgba(0,0,0,0.2),
                    inset 0 -2px 3px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        transform-origin: center;
        transition: all 0.2s ease;
        position: relative;
      ">
        <div style="
          position: absolute;
          bottom: -4px;                 /* Adjusted from -6px */
          left: 50%;
          transform: translateX(-50%);
          width: 6px;                   /* Reduced from 8px */
          height: 6px;                  /* Reduced from 8px */
          background: rgba(0,0,0,0.2);
          border-radius: 50%;
          filter: blur(1px);            /* Reduced blur */
        "></div>
      </div>
    `,
    iconSize: [18, 18],                /* Reduced from [24, 24] */
    iconAnchor: [9, 9],                /* Adjusted to half of iconSize */
    popupAnchor: [0, -9],              /* Adjusted based on new size */
  });
};

// Update markerIcons object to include a fallback color for unknown status
const markerIcons = {
  pending: createMarkerIcon("#F97316"),
  "in-progress": createMarkerIcon("#3B82F6"),
  resolved: createMarkerIcon("#22C55E"),
  default: createMarkerIcon("#6B7280") // Fallback color for unknown status
};

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3000/auth/posts`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);

      const postsArray = Array.isArray(data) ? data : 
                        (data.posts ? data.posts : []);

      setPosts(postsArray);
      
      // Inside the fetchPosts function, update the stats calculation
      if (postsArray.length > 0) {
        const stats = postsArray
          .filter(post => !post.inQueue) // Only count non-queued posts
          .reduce(
            (acc, post) => {
              acc.total++;
              if (post.status === 'in-progress') {
                acc.inProgress++;
              } else {
                acc[post.status]++;
              }
              return acc;
            },
            { total: 0, pending: 0, inProgress: 0, resolved: 0 }
          );
        setStats(stats);

        // Find first non-queued post for map center
        const firstNonQueuedPost = postsArray.find(post => !post.inQueue);
        if (firstNonQueuedPost) {
          setMapCenter([firstNonQueuedPost.location.latitude, firstNonQueuedPost.location.longitude]);
          setMapZoom(12);
        }
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to fetch posts. Please try again later.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:3000/auth/posts/${postId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", 
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchPosts(); // Refresh posts after successful update
    } catch (error) {
      console.error("Error updating post status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleStatCardClick = (status) => {
    // For 'all' status, pass all posts
    if (status === 'all') {
      navigate('/admin/reports', { 
        state: { 
          status: 'all', 
          posts: posts,
          title: 'All Reports'
        } 
      });
    } else {
      // For specific status, filter posts
      const filteredPosts = posts.filter(post => post.status === status);
      navigate('/admin/reports', { 
        state: { 
          status, 
          posts: filteredPosts,
          title: `${status.charAt(0).toUpperCase() + status.slice(1)} Reports`
        } 
      });
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard p-4" style={{ paddingTop: "100px" }}>
      <div 
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "250px",
          backgroundColor: "#F6F9FF",
          zIndex: 1000,
          padding: "1.5rem",
          paddingTop: "24px",
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="m-0" style={{fontWeight: '600'}}>Admin Dashboard</h2>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: "100px" }}>
        <div className="stat-card" style={{ backgroundColor: '#475569' }} onClick={() => handleStatCardClick('all')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Total Reports</h3>
            <BarChart3 size={24} />
          </div>
          <p className="stat-number">{stats.total}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#F97316' }} onClick={() => handleStatCardClick('pending')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Pending</h3>
            <MessageSquare size={24} />
          </div>
          <p className="stat-number">{stats.pending}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#3B82F6' }} onClick={() => handleStatCardClick('in-progress')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>In Progress</h3>
            <Clock size={24} />
          </div>
          <p className="stat-number">{stats.inProgress}</p>
        </div>

        <div className="stat-card" style={{ backgroundColor: '#22C55E' }} onClick={() => handleStatCardClick('resolved')}>
          <div className="d-flex justify-content-between align-items-center">
            <h3>Resolved</h3>
            <CheckCircle2 size={24} />
          </div>
          <p className="stat-number">{stats.resolved}</p>
        </div>
      </div>

      <div className="map-container mt-4">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "70vh", width: "100%", borderRadius: "12px" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {Array.isArray(posts) && posts
            .filter(post => !post.inQueue) // Filter out posts that are queued for deletion
            .map((post) => (
              <Marker
                key={post._id}
                position={[post.location.latitude, post.location.longitude]}
                icon={markerIcons[post.status] || markerIcons.default}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <p>
                      <strong>Status:</strong> {post.status}
                    </p>
                    <p><strong>Category:</strong> {post.category || "Uncategorized"}</p>
                    <p>
                      <strong>Created:</strong> {formatDate(post.createdAt)}
                    </p>
                    <p>
                      <strong>Location:</strong>{" "}
                      {post.location.address || "No address available"}
                    </p>
                    {post.image && (
                      <img
                        src={post.image}
                        alt="Report"
                        style={{ maxWidth: "200px", marginTop: "10px" }}
                      />
                    )}
                    <select
                      value={post.status}
                      onChange={(e) => handleStatusChange(post._id, e.target.value)}
                      className={`status-select ${post.status}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    
                  </div>
                  
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Dashboard;