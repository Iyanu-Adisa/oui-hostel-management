// RoomAllocationEngine.js

/**
 * STEP 1: The Math Engine
 * Calculates the Euclidean distance between two student lifestyle vectors.
 * Lower distance = Higher compatibility.
 * * @param {Array} vectorA - e.g., Adisa's answers [2, 2, 4, 4]
 * @param {Array} vectorB - e.g., Samson's answers [1, 2, 5, 4]
 * @returns {Number} The compatibility distance score
 */
export const calculateEuclideanDistance = (vectorA, vectorB) => {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    throw new Error("Vectors are missing or not the same length");
  }

  let sumOfSquares = 0;

  // Loop through Sleep, Noise, Cleanliness, and Social scores
  for (let i = 0; i < vectorA.length; i++) {
    // Subtract the scores, square the difference, and add it to the total
    const difference = vectorA[i] - vectorB[i];
    sumOfSquares += Math.pow(difference, 2);
  }

  // Return the square root of the total
  return Math.sqrt(sumOfSquares);
};

/**
 * STEP 2: Calculate Room Centroid (The Room's "Average Vibe")
 * Takes all current occupants in a room and calculates their average lifestyle vector.
 * @param {Array} occupants - Array of student objects currently in the room
 * @returns {Array} The average vector [sleepAvg, noiseAvg, cleanAvg, socialAvg]
 */
export const getRoomCentroid = (occupants) => {
  if (!occupants || occupants.length === 0) {
    // If the room is completely empty, return a neutral centroid (3s)
    // or null so the algorithm knows it's a fresh room.
    return [3, 3, 3, 3];
  }

  const numOccupants = occupants.length;
  let sumVector = [0, 0, 0, 0];

  // Add up all the scores for each category
  occupants.forEach((student) => {
    const vector = student.lifestyleVector;
    for (let i = 0; i < 4; i++) {
      sumVector[i] += vector[i];
    }
  });

  // Divide by the number of people to get the average
  return [
    sumVector[0] / numOccupants,
    sumVector[1] / numOccupants,
    sumVector[2] / numOccupants,
    sumVector[3] / numOccupants,
  ];
};

/**
 * STEP 3: Find the Best Room (The K-Means Assignment)
 * Filters out full rooms, compares the student to the remaining rooms, and finds the closest match.
 * @param {Array} studentVector - The target student's array [e.g., 2, 2, 4, 4]
 * @param {Array} availableRooms - List of room objects from Firebase
 * @returns {Object} The best room object for the student
 */
export const findBestRoomMatch = (studentVector, availableRooms) => {
  // 1. The Capacity Lockout Rule: Filter out any rooms that are already full
  const eligibleRooms = availableRooms.filter(
    (room) => room.currentOccupancy < room.maxCapacity,
  );

  if (eligibleRooms.length === 0) {
    throw new Error("No available rooms left in this hostel!");
  }

  let bestRoom = null;
  let shortestDistance = Infinity; // Start with an infinitely bad score

  // 2. Loop through every eligible room to find the best match
  eligibleRooms.forEach((room) => {
    const roomCentroid = getRoomCentroid(room.occupants);

    // Calculate how far the student's lifestyle is from the room's average lifestyle
    const distance = calculateEuclideanDistance(studentVector, roomCentroid);

    // If this room has a shorter distance (better match) than our previous best, update it!
    // Or, prioritize empty rooms if the student is the first one.
    if (distance < shortestDistance) {
      shortestDistance = distance;
      bestRoom = room;
    }
  });

  return bestRoom;
};
