package com.studymate.repository;

import com.studymate.model.UserWarning;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Collection;
import java.util.List;

public interface UserWarningRepository extends MongoRepository<UserWarning, String> {
    List<UserWarning> findByUserId(String userId);

    List<UserWarning> findByUserIdIn(Collection<String> userIds);

    long countByUserIdAndLevel(String userId, String level);
}
