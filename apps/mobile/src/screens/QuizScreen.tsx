import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const MOCK_QUESTIONS = [
  { id: 'q1', question: 'Quel est le format Instagram pour les vidéos courtes ?', options: ['Stories', 'Reels', 'Feed', 'Live'], correctIndex: 1 },
  { id: 'q2', question: 'Combien de hashtags recommandés par publication ?', options: ['1-5', '5-10', '10-15', '15-30'], correctIndex: 3 },
  { id: 'q3', question: 'Qu\'est-ce qu\'un CTA ?', options: ['Un filtre', 'Une invitation à agir', 'Un hashtag', 'Une mention'], correctIndex: 1 },
  { id: 'q4', question: 'Quelle est la meilleure heure pour publier en Afrique de l\'Ouest ?', options: ['6h-8h', '12h-14h', '19h-21h', '22h-00h'], correctIndex: 2 },
  { id: 'q5', question: 'Combien de temps dure un Reel maximum ?', options: ['30 sec', '60 sec', '90 sec', '3 min'], correctIndex: 2 },
];

export default function QuizScreen() {
  const navigation = useNavigation<any>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (optionIndex: number) => {
    if (showResults) return;
    setAnswers({ ...answers, [MOCK_QUESTIONS[currentQuestion].id]: optionIndex });
  };

  const handleNext = () => {
    if (currentQuestion < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    MOCK_QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    return Math.round((correct / MOCK_QUESTIONS.length) * 100);
  };

  const score = calculateScore();
  const passed = score >= 60;

  if (showResults) {
    return (
      <LinearGradient colors={passed ? ['#059669', '#10b981'] : ['#dc2626', '#ef4444']} style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{passed ? '🎉' : '😔'}</Text>
          <Text style={styles.resultTitle}>{passed ? 'Félicitations !' : 'Pas de chance'}</Text>
          <Text style={styles.resultScore}>{score}%</Text>
          <Text style={styles.resultText}>
            {passed ? 'Vous avez réussi le quiz !' : `Réessayez pour atteindre 60%`}
          </Text>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={styles.resultButton} onPress={() => navigation.goBack()}>
              <Text style={styles.resultButtonText}>Retour au cours</Text>
            </TouchableOpacity>
            {!passed && (
              <TouchableOpacity style={[styles.resultButton, styles.retryButton]} onPress={() => { setAnswers({}); setCurrentQuestion(0); setShowResults(false); }}>
                <Text style={styles.resultButtonText}>Réessayer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.quizTitle}>Quiz Module 3</Text>
        <Text style={styles.questionCount}>Q{currentQuestion + 1}/{MOCK_QUESTIONS.length}</Text>
      </LinearGradient>

      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / MOCK_QUESTIONS.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.questionText}>{MOCK_QUESTIONS[currentQuestion].question}</Text>

        <View style={styles.optionsContainer}>
          {MOCK_QUESTIONS[currentQuestion].options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, answers[MOCK_QUESTIONS[currentQuestion].id] === index && styles.optionSelected]}
              onPress={() => handleSelect(index)}
            >
              <View style={[styles.optionLetter, answers[MOCK_QUESTIONS[currentQuestion].id] === index && styles.optionLetterSelected]}>
                <Text style={[styles.optionLetterText, answers[MOCK_QUESTIONS[currentQuestion].id] === index && styles.optionLetterTextSelected]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.optionText, answers[MOCK_QUESTIONS[currentQuestion].id] === index && styles.optionTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !answers[MOCK_QUESTIONS[currentQuestion].id] && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!answers[MOCK_QUESTIONS[currentQuestion].id]}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestion === MOCK_QUESTIONS.length - 1 ? 'Terminer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backIcon: { fontSize: 24, color: '#ffffff' },
  quizTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  questionCount: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  progressContainer: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%', backgroundColor: '#ffffff' },
  content: { flex: 1, padding: 20 },
  scrollContent: { paddingBottom: 100 },
  questionText: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 24 },
  optionsContainer: { gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  optionSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  optionLetter: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLetterSelected: { backgroundColor: '#6366f1' },
  optionLetterText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  optionLetterTextSelected: { color: '#ffffff' },
  optionText: { flex: 1, fontSize: 16, color: '#0f172a' },
  optionTextSelected: { fontWeight: '600' },
  footer: { padding: 20, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  nextButton: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  nextButtonDisabled: { backgroundColor: '#c7d2fe' },
  nextButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultEmoji: { fontSize: 80, marginBottom: 24 },
  resultTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  resultScore: { fontSize: 64, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  resultText: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 40, textAlign: 'center' },
  resultButtons: { width: '100%', gap: 12 },
  resultButton: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, alignItems: 'center' },
  retryButton: { backgroundColor: 'rgba(255,255,255,0.2)' },
  resultButtonText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
});