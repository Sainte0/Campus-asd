import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  pdfUrl: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

const Section = mongoose.models.Section || mongoose.model('Section', sectionSchema);

export default Section; 