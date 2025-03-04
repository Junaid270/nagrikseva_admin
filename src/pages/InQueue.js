import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { Button } from 'react-bootstrap';
import { Clock } from 'lucide-react';
import config from '../config';

const InQueue = () => {
  const [queuedPosts, setQueuedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculateTimeRemaining = (scheduledDeletion) => {
    const now = new Date();
    const deletionDate = new Date(scheduledDeletion);
    const timeLeft = deletionDate - now;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const fetchQueuedPosts = async () => {
      try {
        const response = await fetch(`${config.API_URL}/auth/posts`, {
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
        const inQueuePosts = (Array.isArray(data) ? data : data.posts || [])
          .filter((post) => post.inQueue === true);
        
        setQueuedPosts(inQueuePosts);
      } catch (error) {
        console.error("Error fetching queued posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueuedPosts();
  }, []);

  // Add this useEffect for auto-refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setQueuedPosts(prevPosts => [...prevPosts]); // Force re-render to update times
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-4" style={{ marginTop: "140px", height: "100vh", overflowY: "auto" }}>
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "250px",
          backgroundColor: "#F5F6FA",
          zIndex: 1000,
          padding: "1.5rem",
          paddingTop: "24px",
        }}
      >
        <h2 className="mb-4">In-Queue Reports</h2>
      </div>

      {loading ? (
        <div className="loading">Loading In-Queued reports...</div>
      ) : queuedPosts.length > 0 ? (
        <div className="d-flex flex-wrap gap-4">
          {queuedPosts.map((post) => (
            <div
              key={post._id}
              className="card"
              style={{
                width: "350px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #eee",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <div className="card-body p-4">
                <h4 className="card-title mb-2" style={{ color:'#ff4444' }} >{post.title}</h4>
                <p className="text-muted mb-3">{post.description}</p>

                {post.image && (
                  <div className="mb-3">
                    <img
                      src={post.image}
                      alt="Report"
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={16} className="text-danger" />{" "}
                    {/* Changed from text-warning */}
                    <small className="text-muted">
                      Time until deletion:{" "}
                      {calculateTimeRemaining(post.scheduledDeletion)}
                    </small>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <span
                    className="badge"
                    style={{ backgroundColor: "#ff4444" }} // Changed from bg-warning
                  >
                    Queued for deletion
                  </span>
                  <small className="text-muted">
                    Queued on: {new Date(post.queuedAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-1 text-muted">
        </div>
      )}
    </div>
  );
};

export default InQueue;