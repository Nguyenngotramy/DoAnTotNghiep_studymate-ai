package com.studymate.repository.study;

import com.studymate.model.study.StudyProfile;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface StudyProfileRepository extends MongoRepository<StudyProfile, String> {
    Optional<StudyProfile> findByUserId(String userId);
}