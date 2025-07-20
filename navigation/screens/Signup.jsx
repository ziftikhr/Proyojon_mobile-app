
import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { View, Text, TextInput, Button, StyleSheet, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard, Image, ActivityIndicator,
  ScrollView,
} from 'react-native';

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../FirebaseConfig';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const Signup = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [error, setError] = useState(null);

  // Location states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

    // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await axios.get('https://countriesnow.space/api/v0.1/countries/positions');
        const countryNames = res.data.data.map((c) => c.name);
        setCountries(countryNames);
      } catch (err) {
        console.error('Error fetching countries:', err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states on country change
  useEffect(() => {
    if (!selectedCountry) return;
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await axios.post('https://countriesnow.space/api/v0.1/countries/states', {
          country: selectedCountry,
        });
        const stateNames = res.data.data.states.map((s) => s.name);
        setStates(stateNames);
        setSelectedState('');
        setCities([]);
      } catch (err) {
        console.error('Error fetching states:', err);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [selectedCountry]);

  // Fetch cities on state change
  useEffect(() => {
    if (!selectedCountry || !selectedState) return;
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await axios.post('https://countriesnow.space/api/v0.1/countries/state/cities', {
          country: selectedCountry,
          state: selectedState,
        });
        setCities(res.data.data);
        setSelectedCity('');
      } catch (err) {
        console.error('Error fetching cities:', err);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, [selectedState]);

  const handleSignup = async () => {
    if(!name||!email||!password){
      setError("Name, email and password fields are required");
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Navigate to main app screen or home after successful signup
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        name,
        email,
        facebook,
        instagram,
        location: {
          country: selectedCountry,
          state: selectedState,
          city: selectedCity,
        },
        createdAt: Timestamp.fromDate(new Date()),
        isOnline: false,
      });
      alert('Signup successful!');
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={5}
    >
      <ScrollView>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Image source={require('../../assets/proyojon.png')} style={styles.logo} />
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
        <Text style={styles.title}>Sign Up</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          textContentType="password"
        />
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={24}
            color="maroon"
          />
        </TouchableOpacity>
      </View>
      <TextInput
            style={styles.input}
            placeholder="Facebook URL"
            value={facebook}
            onChangeText={setFacebook}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Instagram URL"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="LinkedIn URL"
            value={linkedin}
            onChangeText={setLinkedin}
            autoCapitalize="none"
          />

          {/* Country Picker */}
          <Text style={styles.label}>Country</Text>
          {loadingCountries ? (
            <ActivityIndicator color="maroon" />
          ) : (
            <Picker
              selectedValue={selectedCountry}
              onValueChange={setSelectedCountry}
              style={styles.picker}
            >
              <Picker.Item label="Select Country" value="" />
              {countries.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          )}

          {/* State Picker */}
          <Text style={styles.label}>State</Text>
          {loadingStates ? (
            <ActivityIndicator color="maroon" />
          ) : (
            <Picker
              selectedValue={selectedState}
              onValueChange={setSelectedState}
              style={styles.picker}
              enabled={states.length > 0}
            >
              <Picker.Item label="Select State" value="" />
              {states.map((s) => (
                <Picker.Item key={s} label={s} value={s} />
              ))}
            </Picker>
          )}

          {/* City Picker */}
          <Text style={styles.label}>City</Text>
          {loadingCities ? (
            <ActivityIndicator color="maroon" />
          ) : (
            <Picker
              selectedValue={selectedCity}
              onValueChange={setSelectedCity}
              style={styles.picker}
              enabled={cities.length > 0}
            >
              <Picker.Item label="Select City" value="" />
              {cities.map((city) => (
                <Picker.Item key={city} label={city} value={city} />
              ))}
            </Picker>
          )}

      <Button title="Sign Up" color="maroon" onPress={handleSignup} />
    </View>
    </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputPassword: {
    flex: 1,
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  toggleButton: {
    marginLeft: 10,
  },
  toggleButtonText: {
    color: 'blue',
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    color: 'blue',
    textAlign: 'center',
  },
});

export default Signup;
