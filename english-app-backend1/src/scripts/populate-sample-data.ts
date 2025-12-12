import mongoose from 'mongoose';
import User from '../models/User';
import Lesson from '../models/Lesson';
import Vocab from '../models/Vocab';
import Quiz from '../models/Quiz';
import Video from '../models/Video';
import Rank from '../models/Rank';
import Badge from '../models/Badge';
import { hashPassword } from '../utils/hash';

// Sample vocabulary data (100 words)
const sampleVocabularies = [
  // Basic Greetings & Common Words
  { word: 'hello', meaning: 'xin chào', pronunciation: '/həˈloʊ/', example: 'Hello, how are you?', category: 'greetings' },
  { word: 'goodbye', meaning: 'tạm biệt', pronunciation: '/ɡʊdˈbaɪ/', example: 'Goodbye, see you tomorrow!', category: 'greetings' },
  { word: 'please', meaning: 'làm ơn', pronunciation: '/pliːz/', example: 'Please help me.', category: 'polite' },
  { word: 'thank you', meaning: 'cảm ơn', pronunciation: '/θæŋk juː/', example: 'Thank you for your help.', category: 'polite' },
  { word: 'sorry', meaning: 'xin lỗi', pronunciation: '/ˈsɔːri/', example: 'Sorry, I am late.', category: 'polite' },
  { word: 'yes', meaning: 'có', pronunciation: '/jes/', example: 'Yes, I understand.', category: 'basic' },
  { word: 'no', meaning: 'không', pronunciation: '/noʊ/', example: 'No, thank you.', category: 'basic' },
  { word: 'help', meaning: 'giúp đỡ', pronunciation: '/help/', example: 'Can you help me?', category: 'basic' },
  { word: 'water', meaning: 'nước', pronunciation: '/ˈwɔːtər/', example: 'I need some water.', category: 'basic' },
  { word: 'food', meaning: 'thức ăn', pronunciation: '/fuːd/', example: 'The food is delicious.', category: 'basic' },

  // Family & People
  { word: 'family', meaning: 'gia đình', pronunciation: '/ˈfæməli/', example: 'I love my family.', category: 'family' },
  { word: 'mother', meaning: 'mẹ', pronunciation: '/ˈmʌðər/', example: 'My mother is kind.', category: 'family' },
  { word: 'father', meaning: 'bố', pronunciation: '/ˈfɑːðər/', example: 'My father works hard.', category: 'family' },
  { word: 'brother', meaning: 'anh/em trai', pronunciation: '/ˈbrʌðər/', example: 'I have a brother.', category: 'family' },
  { word: 'sister', meaning: 'chị/em gái', pronunciation: '/ˈsɪstər/', example: 'My sister is beautiful.', category: 'family' },
  { word: 'friend', meaning: 'bạn bè', pronunciation: '/frend/', example: 'She is my best friend.', category: 'people' },
  { word: 'teacher', meaning: 'giáo viên', pronunciation: '/ˈtiːtʃər/', example: 'The teacher is patient.', category: 'people' },
  { word: 'student', meaning: 'học sinh', pronunciation: '/ˈstuːdənt/', example: 'I am a student.', category: 'people' },
  { word: 'doctor', meaning: 'bác sĩ', pronunciation: '/ˈdɑːktər/', example: 'The doctor is helpful.', category: 'people' },
  { word: 'nurse', meaning: 'y tá', pronunciation: '/nɜːrs/', example: 'The nurse is caring.', category: 'people' },

  // Numbers
  { word: 'one', meaning: 'một', pronunciation: '/wʌn/', example: 'I have one book.', category: 'numbers' },
  { word: 'two', meaning: 'hai', pronunciation: '/tuː/', example: 'There are two cats.', category: 'numbers' },
  { word: 'three', meaning: 'ba', pronunciation: '/θriː/', example: 'I see three birds.', category: 'numbers' },
  { word: 'four', meaning: 'bốn', pronunciation: '/fɔːr/', example: 'Four people are here.', category: 'numbers' },
  { word: 'five', meaning: 'năm', pronunciation: '/faɪv/', example: 'Five minutes left.', category: 'numbers' },
  { word: 'six', meaning: 'sáu', pronunciation: '/sɪks/', example: 'Six apples on the table.', category: 'numbers' },
  { word: 'seven', meaning: 'bảy', pronunciation: '/ˈsevən/', example: 'Seven days in a week.', category: 'numbers' },
  { word: 'eight', meaning: 'tám', pronunciation: '/eɪt/', example: 'Eight o\'clock in the morning.', category: 'numbers' },
  { word: 'nine', meaning: 'chín', pronunciation: '/naɪn/', example: 'Nine students in class.', category: 'numbers' },
  { word: 'ten', meaning: 'mười', pronunciation: '/ten/', example: 'Ten fingers on my hands.', category: 'numbers' },

  // Colors
  { word: 'red', meaning: 'màu đỏ', pronunciation: '/red/', example: 'The apple is red.', category: 'colors' },
  { word: 'blue', meaning: 'màu xanh dương', pronunciation: '/bluː/', example: 'The sky is blue.', category: 'colors' },
  { word: 'green', meaning: 'màu xanh lá', pronunciation: '/ɡriːn/', example: 'The grass is green.', category: 'colors' },
  { word: 'yellow', meaning: 'màu vàng', pronunciation: '/ˈjeloʊ/', example: 'The sun is yellow.', category: 'colors' },
  { word: 'black', meaning: 'màu đen', pronunciation: '/blæk/', example: 'The cat is black.', category: 'colors' },
  { word: 'white', meaning: 'màu trắng', pronunciation: '/waɪt/', example: 'The snow is white.', category: 'colors' },
  { word: 'orange', meaning: 'màu cam', pronunciation: '/ˈɔːrɪndʒ/', example: 'The orange is orange.', category: 'colors' },
  { word: 'purple', meaning: 'màu tím', pronunciation: '/ˈpɜːrpəl/', example: 'The flower is purple.', category: 'colors' },
  { word: 'pink', meaning: 'màu hồng', pronunciation: '/pɪŋk/', example: 'The rose is pink.', category: 'colors' },
  { word: 'brown', meaning: 'màu nâu', pronunciation: '/braʊn/', example: 'The tree is brown.', category: 'colors' },

  // Animals
  { word: 'cat', meaning: 'con mèo', pronunciation: '/kæt/', example: 'The cat is sleeping.', category: 'animals' },
  { word: 'dog', meaning: 'con chó', pronunciation: '/dɔːɡ/', example: 'The dog is playing.', category: 'animals' },
  { word: 'bird', meaning: 'con chim', pronunciation: '/bɜːrd/', example: 'The bird is flying.', category: 'animals' },
  { word: 'fish', meaning: 'con cá', pronunciation: '/fɪʃ/', example: 'The fish is swimming.', category: 'animals' },
  { word: 'horse', meaning: 'con ngựa', pronunciation: '/hɔːrs/', example: 'The horse is running.', category: 'animals' },
  { word: 'cow', meaning: 'con bò', pronunciation: '/kaʊ/', example: 'The cow is eating grass.', category: 'animals' },
  { word: 'pig', meaning: 'con lợn', pronunciation: '/pɪɡ/', example: 'The pig is in the farm.', category: 'animals' },
  { word: 'chicken', meaning: 'con gà', pronunciation: '/ˈtʃɪkən/', example: 'The chicken lays eggs.', category: 'animals' },
  { word: 'duck', meaning: 'con vịt', pronunciation: '/dʌk/', example: 'The duck is swimming.', category: 'animals' },
  { word: 'rabbit', meaning: 'con thỏ', pronunciation: '/ˈræbɪt/', example: 'The rabbit is hopping.', category: 'animals' },

  // Food & Drinks
  { word: 'apple', meaning: 'quả táo', pronunciation: '/ˈæpəl/', example: 'I eat an apple.', category: 'food' },
  { word: 'banana', meaning: 'quả chuối', pronunciation: '/bəˈnænə/', example: 'The banana is yellow.', category: 'food' },
  { word: 'bread', meaning: 'bánh mì', pronunciation: '/bred/', example: 'I buy some bread.', category: 'food' },
  { word: 'milk', meaning: 'sữa', pronunciation: '/mɪlk/', example: 'I drink milk.', category: 'food' },
  { word: 'coffee', meaning: 'cà phê', pronunciation: '/ˈkɔːfi/', example: 'I like coffee.', category: 'food' },
  { word: 'tea', meaning: 'trà', pronunciation: '/tiː/', example: 'Green tea is healthy.', category: 'food' },
  { word: 'rice', meaning: 'cơm', pronunciation: '/raɪs/', example: 'Rice is delicious.', category: 'food' },
  { word: 'meat', meaning: 'thịt', pronunciation: '/miːt/', example: 'I eat meat.', category: 'food' },
  { word: 'vegetable', meaning: 'rau củ', pronunciation: '/ˈvedʒtəbəl/', example: 'Vegetables are healthy.', category: 'food' },
  { word: 'fruit', meaning: 'trái cây', pronunciation: '/fruːt/', example: 'I love fruit.', category: 'food' },

  // Time & Days
  { word: 'morning', meaning: 'buổi sáng', pronunciation: '/ˈmɔːrnɪŋ/', example: 'Good morning!', category: 'time' },
  { word: 'afternoon', meaning: 'buổi chiều', pronunciation: '/ˌæftərˈnuːn/', example: 'Good afternoon!', category: 'time' },
  { word: 'evening', meaning: 'buổi tối', pronunciation: '/ˈiːvnɪŋ/', example: 'Good evening!', category: 'time' },
  { word: 'night', meaning: 'đêm', pronunciation: '/naɪt/', example: 'Good night!', category: 'time' },
  { word: 'today', meaning: 'hôm nay', pronunciation: '/təˈdeɪ/', example: 'Today is Monday.', category: 'time' },
  { word: 'tomorrow', meaning: 'ngày mai', pronunciation: '/təˈmɔːroʊ/', example: 'See you tomorrow.', category: 'time' },
  { word: 'yesterday', meaning: 'hôm qua', pronunciation: '/ˈjestərdeɪ/', example: 'Yesterday was Sunday.', category: 'time' },
  { word: 'week', meaning: 'tuần', pronunciation: '/wiːk/', example: 'Seven days in a week.', category: 'time' },
  { word: 'month', meaning: 'tháng', pronunciation: '/mʌnθ/', example: 'Twelve months in a year.', category: 'time' },
  { word: 'year', meaning: 'năm', pronunciation: '/jɪr/', example: 'Happy New Year!', category: 'time' },

  // Body Parts
  { word: 'head', meaning: 'đầu', pronunciation: '/hed/', example: 'My head hurts.', category: 'body' },
  { word: 'eye', meaning: 'mắt', pronunciation: '/aɪ/', example: 'I have two eyes.', category: 'body' },
  { word: 'nose', meaning: 'mũi', pronunciation: '/noʊz/', example: 'I smell with my nose.', category: 'body' },
  { word: 'mouth', meaning: 'miệng', pronunciation: '/maʊθ/', example: 'I eat with my mouth.', category: 'body' },
  { word: 'ear', meaning: 'tai', pronunciation: '/ɪr/', example: 'I hear with my ears.', category: 'body' },
  { word: 'hand', meaning: 'tay', pronunciation: '/hænd/', example: 'I write with my hand.', category: 'body' },
  { word: 'foot', meaning: 'chân', pronunciation: '/fʊt/', example: 'I walk with my feet.', category: 'body' },
  { word: 'heart', meaning: 'tim', pronunciation: '/hɑːrt/', example: 'My heart beats fast.', category: 'body' },
  { word: 'back', meaning: 'lưng', pronunciation: '/bæk/', example: 'My back is sore.', category: 'body' },
  { word: 'leg', meaning: 'chân', pronunciation: '/leɡ/', example: 'I run with my legs.', category: 'body' },

  // House & Home
  { word: 'house', meaning: 'nhà', pronunciation: '/haʊs/', example: 'I live in a house.', category: 'home' },
  { word: 'room', meaning: 'phòng', pronunciation: '/ruːm/', example: 'My room is clean.', category: 'home' },
  { word: 'door', meaning: 'cửa', pronunciation: '/dɔːr/', example: 'Open the door.', category: 'home' },
  { word: 'window', meaning: 'cửa sổ', pronunciation: '/ˈwɪndoʊ/', example: 'Look out the window.', category: 'home' },
  { word: 'table', meaning: 'bàn', pronunciation: '/ˈteɪbəl/', example: 'The table is big.', category: 'home' },
  { word: 'chair', meaning: 'ghế', pronunciation: '/tʃer/', example: 'Sit on the chair.', category: 'home' },
  { word: 'bed', meaning: 'giường', pronunciation: '/bed/', example: 'I sleep on the bed.', category: 'home' },
  { word: 'kitchen', meaning: 'bếp', pronunciation: '/ˈkɪtʃən/', example: 'I cook in the kitchen.', category: 'home' },
  { word: 'bathroom', meaning: 'phòng tắm', pronunciation: '/ˈbæθruːm/', example: 'I wash in the bathroom.', category: 'home' },
  { word: 'garden', meaning: 'vườn', pronunciation: '/ˈɡɑːrdən/', example: 'The garden is beautiful.', category: 'home' },

  // School & Education
  { word: 'school', meaning: 'trường học', pronunciation: '/skuːl/', example: 'I go to school.', category: 'education' },
  { word: 'book', meaning: 'sách', pronunciation: '/bʊk/', example: 'I read a book.', category: 'education' },
  { word: 'pen', meaning: 'bút', pronunciation: '/pen/', example: 'I write with a pen.', category: 'education' },
  { word: 'pencil', meaning: 'bút chì', pronunciation: '/ˈpensəl/', example: 'I draw with a pencil.', category: 'education' },
  { word: 'paper', meaning: 'giấy', pronunciation: '/ˈpeɪpər/', example: 'I write on paper.', category: 'education' },
  { word: 'computer', meaning: 'máy tính', pronunciation: '/kəmˈpjuːtər/', example: 'I use a computer.', category: 'education' },
  { word: 'phone', meaning: 'điện thoại', pronunciation: '/foʊn/', example: 'I call with my phone.', category: 'education' },
  { word: 'car', meaning: 'xe hơi', pronunciation: '/kɑːr/', example: 'I drive a car.', category: 'transport' },
  { word: 'bus', meaning: 'xe buýt', pronunciation: '/bʌs/', example: 'I take the bus.', category: 'transport' },
  { word: 'bike', meaning: 'xe đạp', pronunciation: '/baɪk/', example: 'I ride my bike.', category: 'transport' },

  // Weather & Nature
  { word: 'sun', meaning: 'mặt trời', pronunciation: '/sʌn/', example: 'The sun is bright.', category: 'weather' },
  { word: 'moon', meaning: 'mặt trăng', pronunciation: '/muːn/', example: 'The moon is beautiful.', category: 'weather' },
  { word: 'rain', meaning: 'mưa', pronunciation: '/reɪn/', example: 'It is raining.', category: 'weather' },
  { word: 'snow', meaning: 'tuyết', pronunciation: '/snoʊ/', example: 'The snow is white.', category: 'weather' },
  { word: 'wind', meaning: 'gió', pronunciation: '/wɪnd/', example: 'The wind is strong.', category: 'weather' },
  { word: 'tree', meaning: 'cây', pronunciation: '/triː/', example: 'The tree is tall.', category: 'nature' },
  { word: 'flower', meaning: 'hoa', pronunciation: '/ˈflaʊər/', example: 'The flower is pretty.', category: 'nature' },
  { word: 'grass', meaning: 'cỏ', pronunciation: '/ɡræs/', example: 'The grass is green.', category: 'nature' },
  { word: 'mountain', meaning: 'núi', pronunciation: '/ˈmaʊntən/', example: 'The mountain is high.', category: 'nature' },
  { word: 'river', meaning: 'sông', pronunciation: '/ˈrɪvər/', example: 'The river is long.', category: 'nature' }
];

// Sample lessons data
const sampleLessons = [
  {
    title: 'Basic Greetings',
    description: 'Learn how to greet people in English',
    level: 1,
    order: 1,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(0, 10).map(v => v.word),
    quizzes: ['quiz-1'],
    videos: ['video-1']
  },
  {
    title: 'Family and People',
    description: 'Learn vocabulary about family members and people',
    level: 1,
    order: 2,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(10, 20).map(v => v.word),
    quizzes: ['quiz-2'],
    videos: ['video-2']
  },
  {
    title: 'Numbers 1-10',
    description: 'Learn to count from one to ten',
    level: 1,
    order: 3,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(20, 30).map(v => v.word),
    quizzes: ['quiz-3'],
    videos: ['video-3']
  },
  {
    title: 'Colors',
    description: 'Learn basic colors in English',
    level: 1,
    order: 4,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(30, 40).map(v => v.word),
    quizzes: ['quiz-4'],
    videos: ['video-4']
  },
  {
    title: 'Animals',
    description: 'Learn names of common animals',
    level: 1,
    order: 5,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(40, 50).map(v => v.word),
    quizzes: ['quiz-5'],
    videos: ['video-5']
  },
  {
    title: 'Food and Drinks',
    description: 'Learn vocabulary about food and beverages',
    level: 2,
    order: 6,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(50, 60).map(v => v.word),
    quizzes: ['quiz-6'],
    videos: ['video-6']
  },
  {
    title: 'Time and Days',
    description: 'Learn to tell time and days of the week',
    level: 2,
    order: 7,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(60, 70).map(v => v.word),
    quizzes: ['quiz-7'],
    videos: ['video-7']
  },
  {
    title: 'Body Parts',
    description: 'Learn names of body parts',
    level: 2,
    order: 8,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(70, 80).map(v => v.word),
    quizzes: ['quiz-8'],
    videos: ['video-8']
  },
  {
    title: 'House and Home',
    description: 'Learn vocabulary about home and furniture',
    level: 2,
    order: 9,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(80, 90).map(v => v.word),
    quizzes: ['quiz-9'],
    videos: ['video-9']
  },
  {
    title: 'School and Education',
    description: 'Learn vocabulary about school and learning',
    level: 3,
    order: 10,
    isActive: true,
    isPublished: true,
    isUnlocked: true,
    vocabulary: sampleVocabularies.slice(90, 100).map(v => v.word),
    quizzes: ['quiz-10'],
    videos: ['video-10']
  }
];

// Sample quizzes data
const sampleQuizzes = [
  {
    title: 'Basic Greetings Quiz',
    description: 'Test your knowledge of basic greetings',
    level: 1,
    questions: [
      {
        question: 'How do you say "xin chào" in English?',
        options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'],
        correctAnswer: 0,
        explanation: 'Hello means "xin chào" in English.'
      },
      {
        question: 'What does "Goodbye" mean?',
        options: ['Xin chào', 'Tạm biệt', 'Cảm ơn', 'Xin lỗi'],
        correctAnswer: 1,
        explanation: 'Goodbye means "tạm biệt" in Vietnamese.'
      },
      {
        question: 'How do you say "cảm ơn" in English?',
        options: ['Please', 'Thank you', 'Sorry', 'Hello'],
        correctAnswer: 1,
        explanation: 'Thank you means "cảm ơn" in English.'
      }
    ],
    timeLimit: 300, // 5 minutes
    passingScore: 60
  },
  {
    title: 'Family Members Quiz',
    description: 'Test your knowledge of family vocabulary',
    level: 1,
    questions: [
      {
        question: 'What is "mẹ" in English?',
        options: ['Father', 'Mother', 'Brother', 'Sister'],
        correctAnswer: 1,
        explanation: 'Mother means "mẹ" in English.'
      },
      {
        question: 'What is "bố" in English?',
        options: ['Mother', 'Father', 'Sister', 'Brother'],
        correctAnswer: 1,
        explanation: 'Father means "bố" in English.'
      },
      {
        question: 'What is "anh trai" in English?',
        options: ['Sister', 'Brother', 'Mother', 'Father'],
        correctAnswer: 1,
        explanation: 'Brother means "anh trai" in English.'
      }
    ],
    timeLimit: 300,
    passingScore: 60
  },
  {
    title: 'Numbers Quiz',
    description: 'Test your knowledge of numbers 1-10',
    level: 1,
    questions: [
      {
        question: 'What is "một" in English?',
        options: ['Two', 'One', 'Three', 'Four'],
        correctAnswer: 1,
        explanation: 'One means "một" in English.'
      },
      {
        question: 'What is "năm" in English?',
        options: ['Four', 'Five', 'Six', 'Seven'],
        correctAnswer: 1,
        explanation: 'Five means "năm" in English.'
      },
      {
        question: 'What is "mười" in English?',
        options: ['Eight', 'Nine', 'Ten', 'Eleven'],
        correctAnswer: 2,
        explanation: 'Ten means "mười" in English.'
      }
    ],
    timeLimit: 300,
    passingScore: 60
  },
  {
    title: 'Colors Quiz',
    description: 'Test your knowledge of basic colors',
    level: 1,
    questions: [
      {
        question: 'What color is the sun?',
        options: ['Blue', 'Red', 'Yellow', 'Green'],
        correctAnswer: 2,
        explanation: 'The sun is yellow.'
      },
      {
        question: 'What color is the sky?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        correctAnswer: 1,
        explanation: 'The sky is blue.'
      },
      {
        question: 'What color is grass?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        correctAnswer: 2,
        explanation: 'Grass is green.'
      }
    ],
    timeLimit: 300,
    passingScore: 60
  },
  {
    title: 'Animals Quiz',
    description: 'Test your knowledge of animal names',
    level: 1,
    questions: [
      {
        question: 'What animal says "meow"?',
        options: ['Dog', 'Cat', 'Bird', 'Fish'],
        correctAnswer: 1,
        explanation: 'Cats say "meow".'
      },
      {
        question: 'What animal says "woof"?',
        options: ['Cat', 'Dog', 'Bird', 'Fish'],
        correctAnswer: 1,
        explanation: 'Dogs say "woof".'
      },
      {
        question: 'What animal can fly?',
        options: ['Cat', 'Dog', 'Bird', 'Fish'],
        correctAnswer: 2,
        explanation: 'Birds can fly.'
      }
    ],
    timeLimit: 300,
    passingScore: 60
  }
];

// Sample videos data - will be created after lessons
const sampleVideos = [
  {
    title: 'Basic Greetings in English',
    description: 'Learn how to greet people properly in English',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 300, // 5 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 1
  },
  {
    title: 'Family Vocabulary',
    description: 'Learn vocabulary about family members',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 420, // 7 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 2
  },
  {
    title: 'Numbers 1-10',
    description: 'Learn to count from one to ten',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 360, // 6 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 3
  },
  {
    title: 'Colors in English',
    description: 'Learn basic colors vocabulary',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 480, // 8 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 4
  },
  {
    title: 'Animal Names',
    description: 'Learn names of common animals',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 540, // 9 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 5
  },
  {
    title: 'Food and Drinks Vocabulary',
    description: 'Learn vocabulary about food and beverages',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 600, // 10 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 6
  },
  {
    title: 'Telling Time',
    description: 'Learn how to tell time in English',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 720, // 12 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 7
  },
  {
    title: 'Body Parts Vocabulary',
    description: 'Learn names of body parts',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 660, // 11 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 8
  },
  {
    title: 'House and Home',
    description: 'Learn vocabulary about home and furniture',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 780, // 13 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 9
  },
  {
    title: 'School and Education',
    description: 'Learn vocabulary about school and learning',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 900, // 15 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    isActive: true,
    order: 10
  }
];

// Sample badges data
const sampleBadges = [
  {
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '👶',
    requirement: { type: 'lessons_completed', value: 1 },
    isActive: true
  },
  {
    name: 'Vocabulary Master',
    description: 'Learn 50 vocabulary words',
    icon: '📚',
    requirement: { type: 'vocabulary_learned', value: 50 },
    isActive: true
  },
  {
    name: 'Quiz Champion',
    description: 'Pass 10 quizzes',
    icon: '🏆',
    requirement: { type: 'quizzes_passed', value: 10 },
    isActive: true
  },
  {
    name: 'Video Watcher',
    description: 'Watch 5 videos',
    icon: '📺',
    requirement: { type: 'videos_watched', value: 5 },
    isActive: true
  },
  {
    name: 'Rookie',
    description: 'Earn 100 points',
    icon: '🥉',
    requirement: { type: 'points_earned', value: 100 },
    isActive: true
  },
  {
    name: 'Master',
    description: 'Earn 500 points',
    icon: '🥇',
    requirement: { type: 'points_earned', value: 500 },
    isActive: true
  }
];

// Helper function to create quizzes for each lesson
function createQuizzesForLesson(lessonIndex: number, lessonTitle: string, lessonId: any, teacherId: any) {
  const quizzes: any[] = [];
  
  // Lesson 0: Basic Greetings
  if (lessonIndex === 0) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'How do you say "xin chào" in English?',
        type: 'multiple_choice',
        options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'],
        correctAnswer: 'Hello',
        explanation: 'Hello is the common greeting in English.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: "_____, how are you?"',
        type: 'fill_blank',
        correctAnswer: 'Hello',
        explanation: 'We use "Hello" to greet someone.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Goodbye" means "tạm biệt".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Goodbye is used when leaving or parting.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match the greetings:',
        type: 'matching',
        pairs: [
          { left: 'Hello', right: 'Xin chào' },
          { left: 'Goodbye', right: 'Tạm biệt' },
          { left: 'Thank you', right: 'Cảm ơn' }
        ],
        correctAnswer: ['Hello-Xin chào', 'Goodbye-Tạm biệt', 'Thank you-Cảm ơn'],
        explanation: 'Basic greeting phrases.',
        isActive: true
      }
    );
  }
  
  // Lesson 1: Family and People
  if (lessonIndex === 1) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "mẹ" in English?',
        type: 'multiple_choice',
        options: ['Father', 'Mother', 'Brother', 'Sister'],
        correctAnswer: 'Mother',
        explanation: 'Mother means mẹ in Vietnamese.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: My _____ is a teacher. (bố)',
        type: 'fill_blank',
        correctAnswer: 'father',
        explanation: 'Father means bố.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Sister" means "chị/em gái".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Sister is the female sibling.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match family members:',
        type: 'matching',
        pairs: [
          { left: 'Mother', right: 'Mẹ' },
          { left: 'Father', right: 'Bố' },
          { left: 'Brother', right: 'Anh/Em trai' }
        ],
        correctAnswer: ['Mother-Mẹ', 'Father-Bố', 'Brother-Anh/Em trai'],
        explanation: 'Family vocabulary.',
        isActive: true
      }
    );
  }
  
  // Lesson 2: Numbers 1-10
  if (lessonIndex === 2) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "một" in English?',
        type: 'multiple_choice',
        options: ['Two', 'One', 'Three', 'Four'],
        correctAnswer: 'One',
        explanation: 'One is the number 1.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: I have _____ books. (5 quyển sách)',
        type: 'fill_blank',
        correctAnswer: 'five',
        explanation: 'Five is the number 5.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Ten" means "mười".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Ten is 10 in English.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match the numbers:',
        type: 'matching',
        pairs: [
          { left: 'One', right: 'Một' },
          { left: 'Five', right: 'Năm' },
          { left: 'Ten', right: 'Mười' }
        ],
        correctAnswer: ['One-Một', 'Five-Năm', 'Ten-Mười'],
        explanation: 'Basic numbers.',
        isActive: true
      }
    );
  }
  
  // Lesson 3: Colors
  if (lessonIndex === 3) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What color is the sun?',
        type: 'multiple_choice',
        options: ['Blue', 'Red', 'Yellow', 'Green'],
        correctAnswer: 'Yellow',
        explanation: 'The sun appears yellow.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: The sky is _____. (xanh dương)',
        type: 'fill_blank',
        correctAnswer: 'blue',
        explanation: 'Blue is the color of the sky.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Green" means "màu xanh lá".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Green is the color of grass.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match the colors:',
        type: 'matching',
        pairs: [
          { left: 'Red', right: 'Màu đỏ' },
          { left: 'Blue', right: 'Màu xanh dương' },
          { left: 'Green', right: 'Màu xanh lá' }
        ],
        correctAnswer: ['Red-Màu đỏ', 'Blue-Màu xanh dương', 'Green-Màu xanh lá'],
        explanation: 'Basic colors.',
        isActive: true
      }
    );
  }
  
  // Lesson 4: Animals
  if (lessonIndex === 4) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What animal says "meow"?',
        type: 'multiple_choice',
        options: ['Dog', 'Cat', 'Bird', 'Fish'],
        correctAnswer: 'Cat',
        explanation: 'Cats say meow.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: A _____ can fly. (con chim)',
        type: 'fill_blank',
        correctAnswer: 'bird',
        explanation: 'Birds can fly.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Dogs say "woof".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Dogs bark and say woof.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match the animals:',
        type: 'matching',
        pairs: [
          { left: 'Cat', right: 'Con mèo' },
          { left: 'Dog', right: 'Con chó' },
          { left: 'Bird', right: 'Con chim' }
        ],
        correctAnswer: ['Cat-Con mèo', 'Dog-Con chó', 'Bird-Con chim'],
        explanation: 'Common animals.',
        isActive: true
      }
    );
  }
  
  // Lesson 5: Food and Drinks
  if (lessonIndex === 5) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "táo" in English?',
        type: 'multiple_choice',
        options: ['Banana', 'Apple', 'Orange', 'Grape'],
        correctAnswer: 'Apple',
        explanation: 'Apple is a red or green fruit.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: I drink _____ every morning. (sữa)',
        type: 'fill_blank',
        correctAnswer: 'milk',
        explanation: 'Milk is a white drink.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Coffee" means "cà phê".',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Coffee is a popular drink.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match food and drinks:',
        type: 'matching',
        pairs: [
          { left: 'Apple', right: 'Táo' },
          { left: 'Milk', right: 'Sữa' },
          { left: 'Bread', right: 'Bánh mì' }
        ],
        correctAnswer: ['Apple-Táo', 'Milk-Sữa', 'Bread-Bánh mì'],
        explanation: 'Common food items.',
        isActive: true
      }
    );
  }
  
  // Lesson 6: Time and Days
  if (lessonIndex === 6) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "buổi sáng" in English?',
        type: 'multiple_choice',
        options: ['Morning', 'Afternoon', 'Evening', 'Night'],
        correctAnswer: 'Morning',
        explanation: 'Morning is the early part of the day.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: See you _____! (ngày mai)',
        type: 'fill_blank',
        correctAnswer: 'tomorrow',
        explanation: 'Tomorrow is the day after today.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: '"Week" has seven days.',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'A week has 7 days.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match time words:',
        type: 'matching',
        pairs: [
          { left: 'Morning', right: 'Buổi sáng' },
          { left: 'Today', right: 'Hôm nay' },
          { left: 'Tomorrow', right: 'Ngày mai' }
        ],
        correctAnswer: ['Morning-Buổi sáng', 'Today-Hôm nay', 'Tomorrow-Ngày mai'],
        explanation: 'Time vocabulary.',
        isActive: true
      }
    );
  }
  
  // Lesson 7: Body Parts
  if (lessonIndex === 7) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "mắt" in English?',
        type: 'multiple_choice',
        options: ['Nose', 'Eye', 'Ear', 'Mouth'],
        correctAnswer: 'Eye',
        explanation: 'We see with our eyes.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: I write with my _____. (tay)',
        type: 'fill_blank',
        correctAnswer: 'hand',
        explanation: 'We use our hands to write.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'We have two ears.',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Humans have two ears.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match body parts:',
        type: 'matching',
        pairs: [
          { left: 'Head', right: 'Đầu' },
          { left: 'Hand', right: 'Tay' },
          { left: 'Foot', right: 'Chân' }
        ],
        correctAnswer: ['Head-Đầu', 'Hand-Tay', 'Foot-Chân'],
        explanation: 'Body parts vocabulary.',
        isActive: true
      }
    );
  }
  
  // Lesson 8: House and Home
  if (lessonIndex === 8) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "nhà" in English?',
        type: 'multiple_choice',
        options: ['Room', 'Door', 'House', 'Window'],
        correctAnswer: 'House',
        explanation: 'House is where we live.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: I sleep on the _____. (giường)',
        type: 'fill_blank',
        correctAnswer: 'bed',
        explanation: 'We sleep on a bed.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'A table is furniture.',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Tables are common furniture.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match home items:',
        type: 'matching',
        pairs: [
          { left: 'Door', right: 'Cửa' },
          { left: 'Table', right: 'Bàn' },
          { left: 'Chair', right: 'Ghế' }
        ],
        correctAnswer: ['Door-Cửa', 'Table-Bàn', 'Chair-Ghế'],
        explanation: 'Home vocabulary.',
        isActive: true
      }
    );
  }
  
  // Lesson 9: School and Education
  if (lessonIndex === 9) {
    quizzes.push(
      {
        lesson: lessonId,
        question: 'What is "sách" in English?',
        type: 'multiple_choice',
        options: ['Pen', 'Book', 'Pencil', 'Paper'],
        correctAnswer: 'Book',
        explanation: 'We read books.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Fill in the blank: I go to _____ every day. (trường học)',
        type: 'fill_blank',
        correctAnswer: 'school',
        explanation: 'School is where we learn.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'A teacher teaches students.',
        type: 'true_false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Teachers educate students.',
        isActive: true
      },
      {
        lesson: lessonId,
        question: 'Match school items:',
        type: 'matching',
        pairs: [
          { left: 'Book', right: 'Sách' },
          { left: 'Pen', right: 'Bút' },
          { left: 'School', right: 'Trường học' }
        ],
        correctAnswer: ['Book-Sách', 'Pen-Bút', 'School-Trường học'],
        explanation: 'School vocabulary.',
        isActive: true
      }
    );
  }
  
  return quizzes;
}

async function populateDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/english-app');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Lesson.deleteMany({});
    await Vocab.deleteMany({});
    await Quiz.deleteMany({});
    await Video.deleteMany({});
    await Rank.deleteMany({});
    await Badge.deleteMany({});

    // Create sample users
    console.log('Creating sample users...');
    const adminPassword = await hashPassword('123123');
    const teacherPassword = await hashPassword('123123');
    const studentPassword = await hashPassword('123123');

    const admin = await User.create({
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      nickname: 'Admin'
    });

    const teacher = await User.create({
      email: 'teacher@example.com',
      passwordHash: teacherPassword,
      role: 'TEACHER',
      nickname: 'Teacher'
    });

    const student = await User.create({
      email: 'student@example.com',
      passwordHash: studentPassword,
      role: 'STUDENT',
      nickname: 'Student'
    });

    console.log('Created users:', { admin: admin.email, teacher: teacher.email, student: student.email });

    // Create sample lessons first
    console.log('Creating sample lessons...');
    console.log(`Sample lessons count: ${sampleLessons.length}`);
    const lessons = await Lesson.insertMany(sampleLessons);
    console.log(`Created ${lessons.length} lessons`);
    console.log('Lesson titles:', lessons.map(l => l.title));

    // Create sample vocabulary with lesson references
    console.log('Creating sample vocabulary...');
    const vocabulariesWithLessons = sampleVocabularies.map((vocab, index) => {
      const lessonIndex = Math.floor(index / 10) % lessons.length; // Distribute vocabs evenly across lessons
      return {
        ...vocab,
        lesson: lessons[lessonIndex]._id,
        phonetic: vocab.pronunciation, // Map pronunciation to phonetic field
        createdBy: teacher._id,
      };
    });
    const vocabularies = await Vocab.insertMany(vocabulariesWithLessons);
    console.log(`Created ${vocabularies.length} vocabulary words`);

    // Create sample videos with lesson references
    console.log('Creating sample videos...');
    console.log(`Sample videos count: ${sampleVideos.length}`);
    const videosWithLessons = sampleVideos.map((video, index) => ({
      ...video,
      lesson: lessons[index]?._id || lessons[0]._id // Link to corresponding lesson
    }));
    const videos = await Video.insertMany(videosWithLessons);
    console.log(`Created ${videos.length} videos`);
    console.log('Video titles:', videos.map(v => v.title));

    // Create sample quizzes - Each quiz is ONE question
    console.log('Creating sample quizzes...');
    const allQuizzes: any[] = [];
    
    // Create 4 quizzes for each lesson (one of each type)
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const lessonQuizzes = createQuizzesForLesson(i, lesson.title, lesson._id, teacher._id);
      allQuizzes.push(...lessonQuizzes);
    }
    
    const quizzes = await Quiz.insertMany(allQuizzes);
    console.log(`Created ${quizzes.length} quiz questions`);

    // Create sample badges
    console.log('Creating sample badges...');
    const badges = await Badge.insertMany(sampleBadges);
    console.log(`Created ${badges.length} badges`);

    // Create sample rank for student
    console.log('Creating sample rank...');
    await Rank.create({
      userId: student._id,
      points: 50,
      level: 1,
      completedLessons: 2
    });

    console.log('✅ Database populated successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: 3 (Admin, Teacher, Student)`);
    console.log(`- Vocabulary: ${vocabularies.length} words`);
    console.log(`- Lessons: ${lessons.length} lessons`);
    console.log(`- Quizzes: ${quizzes.length} quizzes`);
    console.log(`- Videos: ${videos.length} videos`);
    console.log(`- Badges: ${badges.length} badges`);
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@example.com / 123123');
    console.log('Teacher: teacher@example.com / 123123');
    console.log('Student: student@example.com / 123123');

  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  populateDatabase();
}

export default populateDatabase;
