export function createRoomActionExecutor({ getRoomCode, updateRoomFromResponse }) {
  return async function executeRoomAction({ localAction, remoteAction }) {
    const roomCode = getRoomCode();

    if (roomCode) {
      await updateRoomFromResponse(await remoteAction(roomCode));
      return;
    }

    localAction();
  };
}
