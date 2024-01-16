# Discord Bot for WOW Boosting Community

This Discord bot is designed to enhance community engagement on Discord servers, particularly for WOW communities. It automates role management based on user scores from external APIs, manages Discord channels dynamically, and supports various community-related functionalities.

## Features

- **Automatic Role Assignment:** Assigns Discord roles to users based on their scores from external APIs (e.g., raider.io scores for gaming).
- **Dynamic Channel Management:** Creates and manages specific Discord channels for various community activities.
- **Database Integration:** Utilizes MongoDB for robust data management.
- **Custom Commands:** Includes several custom commands for managing community activities, such as `order`, `team`, and `done`.

## Custom Commands

- `order`: Creates a new order with details specified in the command arguments and stores it in the database.
- `team`: Updates an existing order with a team of boosters and edits the corresponding message.
- `done`: Processes a completed boost order, updates booster balances, and notifies involved users.

## Setup and Installation

### Prerequisites

- Node.js
- MongoDB
- A Discord Bot Token

### Installation Steps

1. **Clone the Repository:**
   ```
   git clone https://github.com/MetiAlizadeh/Boosting-Community.git
   ```
2. **Install Dependencies:**
   ```
   cd Boosting-Community
   npm install
   ```
3. **Set Up Environment Variables:**
 Create a .env file in the project root and add the following variables:
   ```
   DISCORD_BOT_TOKEN=your_discord_bot_token
   MONGODB_URI=your_mongodb_uri
   ```
4. **Run the Bot:**
   ```
   npm start
   ```

## Usage

The bot listens for specific commands and triggers in messages to perform various actions, including role assignment, channel management, and order processing for community boosts.

## Contributing

Contributions to this project are welcome. Please fork the repository and submit a pull request with your changes.

# To-Do List
- [ ]  Implement attendance command for managing community event participation.
- [ ]  Develop bank command to handle in-game banking activities or similar functionalities.
