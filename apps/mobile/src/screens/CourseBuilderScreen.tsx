import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { courseService } from '../services/api';

export default function CourseBuilderScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [courseData, setCourseData] = useState({ title: '', description: '', price: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateCourse = async () => {
    if (!courseData.title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    try {
      setIsSaving(true);
      await courseService.create({
        title: courseData.title,
        description: courseData.description,
        priceCfa: Number(courseData.price) || 0,
      });
      Alert.alert('Succes', 'Cours cree avec succes', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error?.response?.data?.error || 'Creation impossible');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un cours</Text>
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map(s => (
            <View key={s} style={[styles.stepDot, s <= step && styles.stepDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Informations générales</Text>
            <Text style={styles.inputLabel}>Titre du cours *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Marketing Digital pour PME"
              value={courseData.title}
              onChangeText={(text) => setCourseData({ ...courseData, title: text })}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez votre cours..."
              multiline
              value={courseData.description}
              onChangeText={(text) => setCourseData({ ...courseData, description: text })}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Programme du cours</Text>
            <Text style={styles.emptyText}>Ajoutez vos modules et leçons</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Ajouter un module</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prix et paiement</Text>
            <Text style={styles.inputLabel}>Prix (GNF)</Text>
            <TextInput
              style={styles.input}
              placeholder="0 = gratuit"
              keyboardType="numeric"
              value={courseData.price}
              onChangeText={(text) => setCourseData({ ...courseData, price: text })}
            />
            {Number(courseData.price) === 0 && (
              <Text style={styles.freeBadge}>Ce cours sera gratuit</Text>
            )}
            {Number(courseData.price) > 0 && (
              <Text style={styles.priceInfo}>
                Prix: {Number(courseData.price).toLocaleString()} GNF
              </Text>
            )}
            <Text style={styles.infoText}>Moyens de paiement: Orange Money, MTN MoMo, Visa</Text>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Publier le cours</Text>
            <Text style={styles.emptyText}>Vérifiez les informations avant publication</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{courseData.title || '(Sans titre)'}</Text>
              <Text style={styles.summaryPrice}>
                {Number(courseData.price) === 0 ? 'Gratuit' : `${Number(courseData.price).toLocaleString()} GNF`}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 4 && styles.saveButton]}
          onPress={step === 4 ? handleCreateCourse : () => setStep(step + 1)}
          disabled={isSaving}
        >
          <Text style={styles.nextButtonText}>
            {isSaving ? 'Creation...' : step === 4 ? 'Creer le cours' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 24, height: 6, borderRadius: 3, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#6366f1' },
  content: { flex: 1, padding: 20 },
  stepContent: { paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0f172a' },
  textArea: { height: 120, textAlignVertical: 'top' },
  emptyText: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  addButton: { borderWidth: 2, borderColor: '#6366f1', borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center' },
  addButtonText: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  freeBadge: { backgroundColor: '#dcfce7', color: '#16a34a', fontSize: 14, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start', overflow: 'hidden' },
  priceInfo: { fontSize: 14, color: '#6366f1', fontWeight: '600', marginTop: 12 },
  infoText: { fontSize: 13, color: '#94a3b8', marginTop: 16, lineHeight: 20 },
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 20 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  summaryPrice: { fontSize: 24, fontWeight: '700', color: '#6366f1' },
  footer: { flexDirection: 'row', padding: 20, gap: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  backButton: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  nextButton: { flex: 2, backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveButton: { backgroundColor: '#16a34a' },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
