import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_STORAGE_KEY = '@medical_notes';

const StorageService = {
  saveNote: async (note) => {
    try {
      const existingNotes = await StorageService.getAllNotes();
      const newNote = {
        id: Date.now().toString(),
        createdAt: new Date(),
        ...note
      };
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify([...existingNotes, newNote]));
      return newNote;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  },

  getAllNotes: async () => {
    try {
      const notes = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      return notes ? JSON.parse(notes) : [];
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  },

  deleteNote: async (noteId) => {
    try {
      const notes = await StorageService.getAllNotes();
      const updatedNotes = notes.filter(note => note.id !== noteId);
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  updateNoteStatus: async (noteId, status) => {
    try {
      const notes = await StorageService.getAllNotes();
      const updatedNotes = notes.map(note => 
        note.id === noteId ? { ...note, status } : note
      );
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error updating note status:', error);
      throw error;
    }
  }
};

export default StorageService;
