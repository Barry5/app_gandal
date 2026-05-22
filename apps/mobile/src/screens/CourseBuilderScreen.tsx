import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function CourseBuilderScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [courseData, setCourseData] = useState({ title: '', description: '', price: '' });

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
            <Text style={styles.infoText}>Moyens de paiement: Orange Money, MTN MoMo, Visa</Text>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Publier le cours</Text>
            <Text style={styles.emptyText}>Vérifiez et publiez votre cours</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.prevButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.prevButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={() => step < 4 ? setStep(step + 1) : navigation.goBack()}>
          <Text style={styles.nextButtonText}>{step === 4 ? 'Publier' : 'Suivant'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#6366f1' },
  content: { flex: 1, padding: 20 },
  stepContent: {},
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  emptyText: { fontSize: 14, color: '#64748b', marginBottom: 20, textAlign: 'center' },
  addButton: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  infoText: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 16 },
  footer: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
  prevButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  prevButtonText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  nextButton: { flex: 2, backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});