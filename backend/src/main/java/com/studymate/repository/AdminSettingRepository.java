package com.studymate.repository;

import com.studymate.model.AdminSetting;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AdminSettingRepository extends MongoRepository<AdminSetting, String> {
}
