// controller/dashboardController.js
async function getStudentData(req, res) {
  // Example payload; replace with real data fetch
  return res.json({
    message: 'Student dashboard data',
    user: req.user,
  });
}

async function getFacultyData(req, res) {
  // Example payload; replace with real data fetch
  return res.json({
    message: 'Faculty dashboard data',
    user: req.user,
  });
}

module.exports = { getStudentData, getFacultyData };