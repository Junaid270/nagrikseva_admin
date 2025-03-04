import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";
import {
  BarChart,
  PieChart,
  RadarChart,
  Bar,
  Pie,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "../components/Dashboard.css";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Filter, Search } from "lucide-react";

// Add these constants before the Reports component
const barColors = {
  Pending: "#F97316",
  "In Progress": "#3B82F6",
  Resolved: "#22C55E",
};

const categoryColors = {
  Water: "#3498DB",
  Roads: "#E74C3C",
  Landslides: "#F39C12",
  Electricity: "#9B59B6",
  Sanitation: "#2ECC71",
  Others: "#34495E",
};

const Reports = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [allPosts, setAllPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [filter, setFilter] = useState("all");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const filterRef = useRef(null);

  const { posts } = location.state || {
    status: "all",
    posts: null,
  };

  useEffect(() => {
    if (!posts) {
      fetchAllPosts();
    } else {
      setAllPosts(posts);
      setFilteredPosts(posts);
      setLoading(false);
    }
  }, [posts]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterRef]);

  const fetchAllPosts = async () => {
    try {
      setLoading(true);
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
      const postsArray = Array.isArray(data) ? data : data.posts || [];
      setAllPosts(postsArray);
      setFilteredPosts(postsArray);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to fetch posts. Please try again later.");
    } finally {
      setLoading(false);
    }
  };


  const handleRowClick = (post) => {
    setSelectedReport(post);
    setShowReportModal(true);
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

      // Update local state
      const updatedPosts = filteredPosts.map((post) =>
        post._id === postId ? { ...post, status: newStatus } : post
      );
      setFilteredPosts(updatedPosts);
      setSelectedReport({ ...selectedReport, status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleApplyFilters = () => {
    setShowFilterDropdown(false);
  };

  const clearAllFilters = () => {
    setStatusFilter("all");
    setTimeFilter("all");
    setSortOrder("newest");
    setShowFilterDropdown(false);
  };

  // Update getFilteredPosts function
  const getFilteredPosts = () => {
    let filtered = filteredPosts
      .filter(post => !post.inQueue) // Filter out queued posts
      .filter((post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((post) => post.status === statusFilter);
    }

    // Time filtering
    const now = new Date();
    switch (timeFilter) {
      case "week":
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(
          (post) => new Date(post.createdAt) > lastWeek
        );
        break;
      case "30days":
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(
          (post) => new Date(post.createdAt) > last30Days
        );
        break;
      case "90days":
        const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(
          (post) => new Date(post.createdAt) > last90Days
        );
        break;
      default:
        break;
    }
    return filtered;
  };

  const currentFilteredPosts = getFilteredPosts();

  // Update the stats calculations for charts
  const statusCounts = currentFilteredPosts
    .filter(post => !post.inQueue) // Filter out queued posts
    .reduce((acc, post) => {
      const statusKey = post.status.replace(/\s+/g, "");
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {});

  // Update category counts
  const categoryCounts = currentFilteredPosts
    .filter(post => !post.inQueue) // Filter out queued posts
    .reduce((acc, post) => {
      acc[post.category] = (acc[post.category] || 0) + 1;
      return acc;
    }, {});

  const barChartData = [
    {
      name: "Reports",
      Pending: statusCounts["pending"] || 0,
      "In Progress": statusCounts["in-progress"] || 0,
      Resolved: statusCounts["resolved"] || 0,
    },
  ];

  const pieChartData = Object.keys(categoryCounts).map((category, index) => ({
    name: category,
    value: categoryCounts[category],
    fill:
      categoryColors[category] ||
      Object.values(categoryColors)[
        index % Object.values(categoryColors).length
      ],
  }));

  const getFilteredAndSortedPosts = (posts) => {
    const filtered = getFilteredPosts();
    
    // Sorting
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  };

  if (loading) return <div className="loading">Loading reports...</div>;
  if (error) return <div className="error">{error}</div>;

  const modalStyles = {
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1050,
    },
    content: {
      position: "relative",
      backgroundColor: "white",
      borderRadius: "20px",
      padding: "20px",
      maxWidth: "90%",
      maxHeight: "90vh",
      overflow: "hidden",
    },
    closeButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "black",
      border: "none",
      borderRadius: "50%",
      width: "30px",
      height: "30px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      color: "white",
      fontSize: "24px",
      lineHeight: "1",
      padding: "0 0 3px 0",
    },
    image: {
      maxWidth: "100%",
      maxHeight: "calc(90vh - 40px)",
      borderRadius: "12px",
      objectFit: "contain",
    },
  };

  const createMarkerIcon = (color) => {
    return L.divIcon({
      className: `custom-marker ${color}`,
      html: `<div class="marker-pin" style="background-color: ${color}"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
    });
  };

  const filterDropdownStyles = {
    container: {
      position: "absolute",
      right: 0,
      top: "100%",
      marginTop: "8px",
      width: "320px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
      zIndex: 1000,
      padding: "16px",
      border: "1px solid #e2e8f0",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
      paddingBottom: "8px",
      borderBottom: "1px solid #e2e8f0",
    },
    title: {
      fontSize: "16px",
      fontWeight: "bold",
      color: "#1e293b",
    },
    clearButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "#64748b",
      cursor: "pointer",
      fontSize: "14px",
    },
    closeButton: {
      backgroundColor: "transparent",
      border: "none",
      color: "#64748b",
      cursor: "pointer",
      fontSize: "20px",
      padding: "0",
      marginLeft: "8px",
    },
    section: {
      marginBottom: "16px",
    },
    sectionTitle: {
      fontSize: "14px",
      fontWeight: "bold",
      marginBottom: "8px",
      color: "#475569",
    },
    optionsContainer: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      marginBottom: "12px",
    },
    option: {
      backgroundColor: "#f1f5f9",
      borderRadius: "16px",
      padding: "6px 12px",
      fontSize: "14px",
      cursor: "pointer",
      border: "1px solid transparent",
    },
    selectedOption: {
      backgroundColor: "#e0f2fe",
      borderColor: "#38bdf8",
      color: "#0284c7",
    },
    applyButton: {
      width: "100%",
      padding: "10px",
      borderRadius: "6px",
      backgroundColor: "#3b82f6",
      color: "white",
      border: "none",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
      marginTop: "8px",
    },
  };

  return (
    <div className="p-4" style={{ marginTop: "160px" }}>
      {" "}
      {/* Add padding to account for fixed header */}
      {/* Add sticky header container */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "250px", // Match your sidebar width
          backgroundColor: "#F5F6FA",
          zIndex: 1000,
          padding: "1.5rem",
          paddingTop: "24px",
          borderBottom: "1px solid #F5F6FA",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-3">
            <h2 className="m-0">All Reports</h2>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-3 align-items-center">
          <div className="flex-grow-1 position-relative">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{
                  padding: "12px 45px", // Increased left padding for search icon
                  paddingRight: "45px", // Space for filter icon
                  borderRadius: "20px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.95rem",
                  width: "100%",
                  backgroundColor: "white",
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
                    marginTop: -23,
                    outline: "none", // Add this to remove the focus outline
                    boxShadow: "none", // Add this to remove any box shadow
                    padding: "8px", // Keep padding for clickable area
                  }}
                  className="no-focus" // Add this class
                >
                  <Filter size={20} color="#64748b" />
                </Button>

                {/* Filter Dropdown - keep existing code */}
                {showFilterDropdown && (
                  <div style={filterDropdownStyles.container}>
                    <div style={filterDropdownStyles.header}>
                      <span style={filterDropdownStyles.title}>Filters</span>
                      <div>
                        <button
                          style={filterDropdownStyles.clearButton}
                          onClick={clearAllFilters}
                        >
                          Clear All
                        </button>
                        <button
                          style={filterDropdownStyles.closeButton}
                          onClick={() => setShowFilterDropdown(false)}
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Status Filters */}
                    <div style={filterDropdownStyles.section}>
                      <div style={filterDropdownStyles.sectionTitle}>
                        Status
                      </div>
                      <div style={filterDropdownStyles.optionsContainer}>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(statusFilter === "pending"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setStatusFilter("pending")}
                        >
                          Pending
                        </div>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(statusFilter === "in-progress"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setStatusFilter("in-progress")}
                        >
                          In Progress
                        </div>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(statusFilter === "resolved"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setStatusFilter("resolved")}
                        >
                          Resolved
                        </div>
                      </div>
                    </div>

                    {/* Time Frame Filters */}
                    <div style={filterDropdownStyles.section}>
                      <div style={filterDropdownStyles.sectionTitle}>
                        Time Frame
                      </div>
                      <div style={filterDropdownStyles.optionsContainer}>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(timeFilter === "week"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setTimeFilter("week")}
                        >
                          This Week
                        </div>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(timeFilter === "30days"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setTimeFilter("30days")}
                        >
                          Last 30 Days
                        </div>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(timeFilter === "90days"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setTimeFilter("90days")}
                        >
                          Last 90 Days
                        </div>
                      </div>
                    </div>

                    {/* Sort By Filters */}
                    <div style={filterDropdownStyles.section}>
                      <div style={filterDropdownStyles.sectionTitle}>
                        Sort By
                      </div>
                      <div style={filterDropdownStyles.optionsContainer}>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(sortOrder === "newest"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setSortOrder("newest")}
                        >
                          Newest to Oldest
                        </div>
                        <div
                          style={{
                            ...filterDropdownStyles.option,
                            ...(sortOrder === "oldest"
                              ? filterDropdownStyles.selectedOption
                              : {}),
                          }}
                          onClick={() => setSortOrder("oldest")}
                        >
                          Oldest to Newest
                        </div>
                      </div>
                    </div>

                    <button
                      style={filterDropdownStyles.applyButton}
                      onClick={handleApplyFilters}
                    >
                      Apply Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Charts section */}
      <div className="d-flex flex-wrap gap-4 mb-4">
        {/* Reports by Status */}
        <div className="card" style={{ flex: "1", minWidth: "300px" }}>
          <div className="card-body">
            <h5 className="card-title mb-4">Reports by Status</h5>
            <BarChart width={400} height={300} data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Pending" fill={barColors.Pending} />
              <Bar dataKey="In Progress" fill={barColors["In Progress"]} />
              <Bar dataKey="Resolved" fill={barColors.Resolved} />
            </BarChart>
          </div>
        </div>

        {/* Reports by Category */}
        <div className="card" style={{ flex: "1", minWidth: "300px" }}>
          <div className="card-body">
            <h5 className="card-title mb-4">Reports by Category</h5>
            <PieChart width={400} height={300}>
              <Pie
                data={pieChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                fill="#8884d8"
                label
              ></Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>

        {/* Reports Comparison */}
        <div className="card" style={{ flex: "1", minWidth: "300px" }}>
          <div className="card-body">
            <h5 className="card-title mb-4">Reports Comparison</h5>
            <RadarChart
              outerRadius={100}
              width={400}
              height={300}
              data={pieChartData}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis />
              <Radar
                name="Reports"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </div>
        </div>
      </div>
      {/* Reports List Table */}
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Category</th>
                <th>Created</th>
                <th>Location</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedPosts(filteredPosts)
                .filter(post => !post.inQueue) // Filter out queued posts
                .map((post) => (
                <tr
                  key={post._id}
                  onClick={() => handleRowClick(post)}
                  style={{ cursor: "pointer" }}
                  className="hover-row"
                >
                  <td>{post._id}</td>
                  <td>
                    <span
                      className={`badge bg-${
                        post.status === "pending"
                          ? "warning"
                          : post.status === "in-progress"
                          ? "primary"
                          : "success"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td>{post.category}</td>
                  <td>{new Date(post.createdAt).toLocaleString()}</td>
                  <td>{post.location.address}</td>
                  <td>
                    {post.image ? (
                      <img
                        src={post.image}
                        alt="Report"
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(post.image);
                          setShowImageModal(true);
                        }}
                      />
                    ) : (
                      "No image"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div style={modalStyles.modal} onClick={() => setShowImageModal(false)}>
          <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
            <button
              style={modalStyles.closeButton}
              onClick={() => setShowImageModal(false)}
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Report Details"
              style={modalStyles.image}
            />
          </div>
        </div>
      )}
      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div
          style={modalStyles.modal}
          onClick={() => setShowReportModal(false)}
        >
          <div
            style={{
              ...modalStyles.content,
              width: "600px",
              maxWidth: "95%",
              padding: "0",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "24px 24px 0",
                position: "relative",
                borderBottom: "1px solid #eee",
              }}
            >
              <button
                style={modalStyles.closeButton}
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
              <h3 style={{ marginBottom: "20px", fontSize: "1.5rem" }}>
                Report Details
              </h3>
            </div>

            <div
              style={{
                padding: "24px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>Status</h5>
                <div className="d-flex align-items-center gap-3">
                  <span
                    className={`badge bg-${
                      selectedReport.status === "pending"
                        ? "warning"
                        : selectedReport.status === "in-progress"
                        ? "primary"
                        : "success"
                    }`}
                    style={{ fontSize: "0.9rem", padding: "8px 12px" }}
                  >
                    {selectedReport.status}
                  </span>
                  <select
                    className="form-select"
                    style={{ width: "auto", minWidth: "150px" }}
                    value={selectedReport.status}
                    onChange={(e) =>
                      handleStatusChange(selectedReport._id, e.target.value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>Title</h5>
                <p style={{ fontSize: "1rem", margin: 0, color: "#666" }}>
                  {selectedReport.title}
                </p>
              </div>

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>Category</h5>
                <p style={{ fontSize: "1rem", margin: 0, color: "#666" }}>
                  {selectedReport.category}
                </p>
              </div>

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>
                  Description
                </h5>
                <p style={{ fontSize: "1rem", margin: 0, color: "#666" }}>
                  {selectedReport.description}
                </p>
              </div>

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>Location</h5>
                <p style={{ fontSize: "1rem", margin: 0, color: "#666" }}>
                  {selectedReport.location.address}
                  <br />
                  <small className="text-muted">
                    Lat: {selectedReport.location.latitude}, Long:{" "}
                    {selectedReport.location.longitude}
                  </small>
                </p>
              </div>

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>
                  Created At
                </h5>
                <p style={{ fontSize: "1rem", margin: 0, color: "#666" }}>
                  {new Date(selectedReport.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedReport.image && (
                <div className="mb-4">
                  <h5 style={{ fontSize: "1.1rem", color: "black" }}>Image</h5>
                  <img
                    src={selectedReport.image}
                    alt="Report"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelectedImage(selectedReport.image);
                      setShowImageModal(true);
                      setShowReportModal(false);
                    }}
                  />
                </div>
              )}

              <div className="mb-4">
                <h5 style={{ fontSize: "1.1rem", color: "black" }}>
                  Location on Map
                </h5>
                <div
                  style={{
                    height: "300px",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <MapContainer
                    center={[
                      selectedReport.location.latitude,
                      selectedReport.location.longitude,
                    ]}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker
                      position={[
                        selectedReport.location.latitude,
                        selectedReport.location.longitude,
                      ]}
                      icon={createMarkerIcon("#ef4444")}
                    />
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;