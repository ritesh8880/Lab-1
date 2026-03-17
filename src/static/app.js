document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity dropdown before repopulating to prevent duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsList = details.participants.length > 0
          ? details.participants.map(p => `
              <li class="participant-item" data-activity="${name}" data-email="${p}">
                <span class="participant-email">${p}</span>
                <button type="button" class="participant-remove" data-activity="${name}" data-email="${p}" aria-label="Unregister ${p}">✕</button>
              </li>
            `).join("")
          : "<li class=\"participant-empty\"><em>No participants yet</em></li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            <ul class="participants-list">
              ${participantsList}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // bind unregister buttons for this activity card
        activityCard.querySelectorAll('.participant-remove').forEach((removeBtn) => {
          removeBtn.addEventListener('click', async () => {
            const activityName = removeBtn.dataset.activity;
            const email = removeBtn.dataset.email;

            try {
              const deleteResp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );

              const deleteResult = await deleteResp.json();

              if (deleteResp.ok) {
                messageDiv.textContent = deleteResult.message;
                messageDiv.className = 'success';
                fetchActivities();
              } else {
                messageDiv.textContent = deleteResult.detail || 'Could not unregister participant';
                messageDiv.className = 'error';
              }
            } catch (err) {
              messageDiv.textContent = 'Failed to unregister participant. Please try again.';
              messageDiv.className = 'error';
              console.error('Error removing participant:', err);
            } finally {
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
