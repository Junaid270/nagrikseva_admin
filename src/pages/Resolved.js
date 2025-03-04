import React, { useState, useEffect, useRef } from "react";
import { Trash2, Calendar, MapPin, ImagePlus, Check, Search, Filter } from "lucide-react";
import config from "../config";
import "../components/Dashboard.css";
// eslint-disable-next-line no-unused-vars
import { Button, Modal, Alert, OverlayTrigger, Tooltip } from "react-bootstrap";
import { usePost } from "../context/PostContext";
import axios from "axios";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const Resolved = () => {
  const [resolvedPosts, setResolvedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [crop, setCrop] = useState({ aspect: 1 / 1, unit: "%", width: 50 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [selectedFileName, setSelectedFileName] = useState({});
  const [uploadedPosts, setUploadedPosts] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest'); // Changed default to 'oldest'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  usePost();
    const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchResolvedPosts = async () => {
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
        const resolvedPosts = (
          Array.isArray(data) ? data : data.posts || []
        ).filter((post) => post.status === "resolved");

        // Initialize uploadedPosts with posts that already have solution images
        const postsWithSolutions = new Set(
          resolvedPosts
            .filter(post => post.SolutionImage)
            .map(post => post._id)
        );
        setUploadedPosts(postsWithSolutions);
        
        setResolvedPosts(resolvedPosts);
      } catch (error) {
        console.error("Error fetching resolved posts:", error);
        setError("Failed to fetch resolved reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchResolvedPosts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // eslint-disable-next-line no-empty-pattern
  const [] = useState({ totalPosts: 0, totalUsers: 0 });
  // eslint-disable-next-line no-unused-vars
  const [reportedPosts, setReportedPosts] = useState([]);

   const handleDelete = (post) => {
     setSelectedPost(post);
     setShowModal(true);
   };

   const confirmDelete = async () => {
     try {
       const postId = selectedPost._id.toString();
       
       // Add queuedAt timestamp and inQueue status
       const response = await fetch(`${config.API_URL}/admin/posts/${postId}`, {
         method: "PUT",
         credentials: "include",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           inQueue: true,
           queuedAt: new Date().toISOString(),
           //  scheduledDeletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
           scheduledDeletion: new Date(
             Date.now() + 3 * 60 * 1000
           ).toISOString(), // 3 minutes from now
         }),
       });

       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }

       const data = await response.json();
       if (data.success) {
         // Remove post from resolved posts list
         setResolvedPosts((prevPosts) =>
           prevPosts.filter((p) => p._id !== selectedPost._id)
         );
         
         setShowModal(false);
         setShowSuccessModal(true);
       } else {
         throw new Error(data.message || 'Failed to queue post for deletion');
       }
     } catch (error) {
       console.error("Error queuing post for deletion:", error);
       alert(`Failed to queue post for deletion: ${error.message}`);
     }
   };

  const handleFileSelect = (postId, event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFileName(prev => ({
        ...prev,
        [postId]: file.name
      }));
      setSelectedFile(URL.createObjectURL(file));
      setSelectedPostId(postId);
      setShowImageModal(true);
    }
  };

const getCroppedImage = async () => {
  if (!completedCrop || !imgRef.current || !canvasRef.current) return null;

  const image = imgRef.current;
  const canvas = canvasRef.current;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const ctx = canvas.getContext('2d');

  // Set the canvas dimensions to match the crop dimensions
  canvas.width = completedCrop.width;
  canvas.height = completedCrop.height;

  ctx.drawImage(
    image,
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
    0,
    0,
    completedCrop.width,
    completedCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          resolve(reader.result);
        };
      },
      'image/jpeg',
      5 // Maximum quality
    );
  });
};

const handleImageUpload = async () => {
  try {
    if (!completedCrop || !imgRef.current) {
      alert('Please crop the image before uploading');
      return;
    }

    const croppedImageBase64 = await getCroppedImage();
    if (!croppedImageBase64) {
      throw new Error('Failed to crop image');
    }

    const response = await axios.put(
      `${config.API_URL}/auth/posts/${selectedPostId}/solution-image`,
      { 
        solutionImage: croppedImageBase64,
        originalWidth: completedCrop.width,
        originalHeight: completedCrop.height
      },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.status === 200) {
      // Add to uploaded posts set
      setUploadedPosts(prev => new Set([...prev, selectedPostId]));
      
      // Update local state
      setResolvedPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === selectedPostId 
            ? { ...post, SolutionImage: croppedImageBase64 }
            : post
        )
      );

      // Clear modal state
      setShowImageModal(false);
      setSelectedFile(null);
      setSelectedFileName(prev => {
        const newState = { ...prev };
        delete newState[selectedPostId];
        return newState;
      });
      setSelectedPostId(null);
      setCrop({ aspect: 1 / 1, unit: '%', width: 50 });
      setCompletedCrop(null);
    }
  } catch (error) {
    console.error('Error uploading solution image:', error);
    alert('Failed to upload image. Please try again.');
  }
};

    const toggleDescription = (postId, e) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedPosts);
      if (newExpanded.has(postId)) {
        newExpanded.delete(postId);
      } else {
        newExpanded.add(postId);
      }
      setExpandedPosts(newExpanded);
    };

    const getSortedPosts = (posts) => {
      const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return filteredPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
    };

    if (loading) {
      return <div className="loading">Loading resolved reports...</div>;
    }

    if (error) {
      return <div className="error">{error}</div>;
    }

  return (
    <div
      className="p-4"
      style={{ paddingTop: "140px", height: "100vh", overflowY: "auto" }}
    >
      {" "}
      {/* Add padding to account for fixed header */}
      {/* Add new sticky header container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "250px", // Width of the sidebar - adjust this value to match your sidebar width
          backgroundColor: "#F5F6FA",
          blurRadius: 20,
          zIndex: 1000,
          padding: "1.5rem",
          paddingTop: "24px",
        }}
      >
        <h2 className="mb-4">Resolved Reports</h2>

        <div className="d-flex align-items-center gap-3">
          <div className="position-relative flex-grow-1">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{
                  padding: "12px 45px",
                  paddingRight: "45px",
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.95rem",
                  width: "100%",
                }}
              />
              <Search
                size={20}
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <div className="position-relative" ref={filterRef}>
                <Button
                  variant="light"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "transparent",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    outline: "none",
                    boxShadow: "none",
                    padding: "8px",
                    marginTop: -23,
                  }}
                  className="no-focus"
                >
                  <Filter size={20} color="#64748b" />
                </Button>

                {/* Keep existing filter dropdown code */}
                {showFilterDropdown && (
                  <div
                    className="position-absolute end-0 mt-2 py-2"
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      border: "1px solid #e2e8f0",
                      zIndex: 1000,
                      minWidth: "160px",
                    }}
                  >
                    <div
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortOrder("newest");
                        setShowFilterDropdown(false);
                      }}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          sortOrder === "newest" ? "#f1f5f9" : "transparent",
                      }}
                    >
                      Newest First
                    </div>
                    <div
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortOrder("oldest");
                        setShowFilterDropdown(false);
                      }}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          sortOrder === "oldest" ? "#f1f5f9" : "transparent",
                      }}
                    >
                      Oldest First
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Rest of your existing content */}
      <div className="d-flex flex-wrap gap-4" style={{ marginTop: "150px" }}>
        {getSortedPosts(resolvedPosts).map((post) => (
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
              <h4 className="card-title mb-2" style={{ color: "#22C55E" }}>
                {post.title}
              </h4>

              <span
                className="badge d-inline-block mb-3"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                }}
              >
                {post.category}
              </span>

              <div className="mb-3">
                <p
                  className="text-muted"
                  style={{
                    fontSize: "0.9rem",
                    margin: 0,
                    ...(expandedPosts.has(post._id)
                      ? {}
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }),
                  }}
                >
                  {post.description}
                </p>
                {post.description.length > 150 && (
                  <span
                    onClick={(e) => toggleDescription(post._id, e)}
                    style={{
                      color: "#2196F3",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      display: "inline-block",
                      marginTop: "4px",
                    }}
                  >
                    {expandedPosts.has(post._id) ? "Read less" : "...Read more"}
                  </span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2 mb-2">
                <Calendar size={16} className="text-muted" />
                <small className="text-muted">
                  {formatDate(post.createdAt)}
                </small>
              </div>

              <div className="d-flex align-items-center gap-2 mb-3">
                <MapPin size={16} className="text-muted" />
                <small className="text-muted">
                  {post.location.address || "No address available"}
                </small>
              </div>

              {post.image && (
                <div className="mb-3">
                  <img
                    src={post.image}
                    alt="Report"
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                  />
                </div>
              )}

              <div className="d-flex gap-2 mt-3">
                <div className="d-flex align-items-center">
                  {selectedFileName[post._id] && (
                    <span
                      style={{
                        backgroundColor: "#f3f4f6",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        marginRight: "8px",
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedFileName[post._id]}
                    </span>
                  )}
                  {!uploadedPosts.has(post._id) ? (
                    <Button
                      variant="primary"
                      style={{
                        borderRadius: "8px",
                        padding: "8px",
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#3b82f6",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "unset",
                        position: "relative",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(post._id, e)}
                        style={{
                          opacity: 0,
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          cursor: "pointer",
                        }}
                      />
                      <ImagePlus size={16} color="white" />
                    </Button>
                  ) : (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-${post._id}`}>
                          Image proof has already been uploaded
                        </Tooltip>
                      }
                    >
                      <span>
                        {" "}
                        {/* Wrap button in span to make tooltip work with disabled button */}
                        <Button
                          variant="success"
                          style={{
                            borderRadius: "8px",
                            padding: "8px",
                            width: "36px",
                            height: "36px",
                            backgroundColor: "#22C55E",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "unset",
                            cursor: "default",
                          }}
                          disabled
                        >
                          <Check size={16} color="white" />
                        </Button>
                      </span>
                    </OverlayTrigger>
                  )}
                </div>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip>
                      {!uploadedPosts.has(post._id)
                        ? "Please upload an image proof before deleting"
                        : "Click to delete this post"}
                    </Tooltip>
                  }
                >
                  <span style={{ display: "inline-block" }}>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(post)}
                      disabled={!uploadedPosts.has(post._id)}
                      style={{
                        borderRadius: "8px",
                        padding: "8px",
                        width: "36px",
                        height: "36px",
                        backgroundColor: !uploadedPosts.has(post._id)
                          ? "#fca5a5"
                          : "#ef4444",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "unset",
                        cursor: !uploadedPosts.has(post._id)
                          ? "not-allowed"
                          : "pointer",
                        opacity: !uploadedPosts.has(post._id) ? "0.6" : "1",
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </span>
                </OverlayTrigger>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete "{selectedPost?.title}"?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crop & Upload Image</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFile && (
            <ReactCrop
              src={selectedFile}
              crop={crop}
              onChange={(newCrop) => setCrop(newCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              minWidth={100}
              minHeight={100}
            >
              <img
                ref={imgRef}
                src={selectedFile}
                alt="To be cropped"
                style={{ maxHeight: "70vh" }}
              />
            </ReactCrop>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleImageUpload}>
            Upload Image
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Add this success modal component */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Post Queued for Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <div className="mb-3" style={{ color: "#4B5563" }}>
              "{selectedPost?.title}" has been queued for deletion and will be
              automatically deleted after 7 days.
            </div>
            <div className="text-muted" style={{ fontSize: "0.9rem" }}>
              You can view this post in the In-Queue section until it's deleted.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Resolved;
